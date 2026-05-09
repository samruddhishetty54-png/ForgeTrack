import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { model } from '../lib/gemini';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ChevronRight, 
  Calendar, 
  UserCheck, 
  Database,
  History,
  Info
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const BulkAttendance = () => {
  const { userProfile } = useAuth();
  const [file, setFile] = useState(null);
  const [workbook, setWorkbook] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheets, setSelectedSheets] = useState([]);
  const [step, setStep] = useState(1); // 1: Upload, 2: Select Sheets, 3: AI Mapping & Review, 4: Duplicate Check, 5: Resolve Dates, 6: Success
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState(null);
  
  const [mappedData, setMappedData] = useState([]);
  const [mappingResult, setMappingResult] = useState(null);
  const [missingDates, setMissingDates] = useState([]);
  const [suggestedDates, setSuggestedDates] = useState({});
  const [scheduleInfo, setScheduleInfo] = useState({ days: [], startDate: '' });
  const [duplicates, setDuplicates] = useState([]);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  const fileInputRef = useRef(null);

  // Handle File Upload
  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setLoading(true);
    setStatus('Reading file...');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        setStep(2);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Failed to read Excel file. Please ensure it is a valid .xlsx or .csv file.');
        setLoading(false);
      }
    };
    reader.readAsBinaryString(uploadedFile);
  };

  const toggleSheetSelection = (sheetName) => {
    setSelectedSheets(prev => 
      prev.includes(sheetName) 
        ? prev.filter(s => s !== sheetName) 
        : [...prev, sheetName]
    );
  };

  // Step 3: AI Analysis
  const analyzeWithAI = async () => {
    if (selectedSheets.length === 0) return;
    
    setLoading(true);
    setStep(3);
    setStatus('AI is analyzing sheet structure and mapping fields...');

    try {
      const allResults = [];
      for (const sheetName of selectedSheets) {
        const sheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        // Take a sample of first 10 rows for AI to analyze
        const sample = rawData.slice(0, 15);
        
        const prompt = `
          Analyze the following spreadsheet data sample (first 15 rows) from sheet "${sheetName}".
          
          Data:
          ${JSON.stringify(sample, null, 2)}
          
          Identify:
          1. Which column represents the Student USN/Roll Number? (Index)
          2. Which column represents the Student Name? (Index)
          3. Which columns represent Attendance for different sessions? 
             Identify them by index and provide the session date or name if found in headers.
          4. What is the value used to indicate a student is 'Present'? (e.g., true, "Present", "P", 1)
          
          Return only a JSON object in this format:
          {
            "usnColumnIndex": number,
            "nameColumnIndex": number,
            "attendanceColumns": [
              { "index": number, "date": "YYYY-MM-DD" or null, "label": "string" }
            ],
            "dataStartRow": number,
            "presentValue": any
          }
          
          If a date is not explicitly found for an attendance column, return null for "date".
          Important: The dataStartRow is the index of the FIRST row containing actual student data.
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const cleanedJson = responseText.replace(/```json|```/g, '').trim();
        const mapping = JSON.parse(cleanedJson);
        
        allResults.push({ sheetName, mapping, rawData });
      }

      setMappingResult(allResults);
      setLoading(false);
      
      // Check for missing dates
      const missing = [];
      allResults.forEach(res => {
        res.mapping.attendanceColumns.forEach(col => {
          if (!col.date) {
            missing.push({ sheetName: res.sheetName, label: col.label, index: col.index });
          }
        });
      });
      
      if (missing.length > 0) {
        setMissingDates(missing);
      }
    } catch (err) {
      console.error(err);
      setError('AI mapping failed. ' + err.message);
      setLoading(false);
    }
  };

  const handleDateResolution = async () => {
    setLoading(true);
    setStatus('Checking for existing sessions in database...');
    
    try {
      // Collect all dates (including suggested ones)
      const sessionsToCheck = [];
      mappingResult.forEach(res => {
        res.mapping.attendanceColumns.forEach(col => {
          const date = col.date || suggestedDates[`${res.sheetName}-${col.index}`];
          if (date) {
            sessionsToCheck.push({ date, sheetName: res.sheetName, label: col.label });
          }
        });
      });

      // Check Supabase for duplicates
      const uniqueDates = [...new Set(sessionsToCheck.map(s => s.date))].filter(Boolean);
      
      if (uniqueDates.length === 0) {
        proceedToFinalReview();
        return;
      }

      const fetchPromise = supabase
        .from('sessions')
        .select('date, topic')
        .in('date', uniqueDates);

      const { data: existingSessions, error: sessError } = await fetchPromise;
      if (sessError) console.error("Session Fetch Error:", sessError);

      if (sessError) throw sessError;

      if (existingSessions && existingSessions.length > 0) {
        setDuplicates(existingSessions);
        setStep(4); // Show duplicate warning
      } else {
        proceedToFinalReview();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const proceedToFinalReview = () => {
    setStep(5);
  };

  const startImport = async () => {
    setLoading(true);
    setStatus('Importing attendance data...');
    
    let totalRows = 0;
    mappingResult.forEach(res => {
      // Filter out header rows and empty rows
      const studentRows = res.rawData.slice(res.mapping.dataStartRow);
      totalRows += studentRows.length * res.mapping.attendanceColumns.length;
    });

    setImportProgress({ current: 0, total: totalRows });

    try {
      // 1. Create Import Log
      const { data: importLog, error: logError } = await supabase
        .from('import_log')
        .insert({
          filename: file.name,
          uploaded_by: userProfile.email,
          total_rows: totalRows,
          imported_rows: 0,
          skipped_rows: 0,
          status: 'processing'
        })
        .select()
        .single();

      if (logError) throw logError;

      let importedCount = 0;
      let skippedCount = 0;

      for (const res of mappingResult) {
        const { mapping, rawData, sheetName } = res;
        const studentRows = rawData.slice(mapping.dataStartRow);

        for (const col of mapping.attendanceColumns) {
          const sessionDate = col.date || suggestedDates[`${sheetName}-${col.index}`];
          if (!sessionDate) continue;

          // Ensure session exists
          let { data: session, error: sessError } = await supabase
            .from('sessions')
            .select('id')
            .eq('date', sessionDate)
            .single();

          if (!session) {
            const { data: newSess, error: createSessError } = await supabase
              .from('sessions')
              .insert({
                date: sessionDate,
                topic: col.label || 'Imported Session',
                month_number: new Date(sessionDate).getMonth() + 1,
                session_type: 'offline'
              })
              .select()
              .single();
            
            if (createSessError) {
              console.error('Error creating session:', createSessError);
              continue;
            }
            session = newSess;
          }

          // Prepare attendance batch
          const attendanceData = [];
          for (const row of studentRows) {
            let usn = row[mapping.usnColumnIndex];
            if (usn) usn = String(usn).trim().toUpperCase();

            const rawVal = row[col.index];
            const presentValue = mapping.presentValue;
            
            let present = false;
            if (rawVal === true || rawVal === 1 || String(rawVal).toLowerCase() === 'present' || String(rawVal).toLowerCase() === 'p' || String(rawVal).toLowerCase() === 'yes') {
              present = true;
            } else if (presentValue && String(rawVal).toLowerCase() === String(presentValue).toLowerCase()) {
              present = true;
            }

            if (!usn || usn === 'USN') continue; // Skip header leftovers

            // Find or Create student
            let { data: student } = await supabase
              .from('students')
              .select('id')
              .eq('usn', usn)
              .single();

            if (!student) {
              // Create missing student
              const { data: newStudent, error: createError } = await supabase
                .from('students')
                .insert({
                  name: row[mapping.nameColumnIndex] || 'Unknown Student',
                  usn: usn,
                  branch_code: String(usn).substring(5, 7).toUpperCase() || 'GEN',
                  batch: '2024-2028'
                })
                .select()
                .single();
              
              if (!createError) {
                student = newStudent;
              }
            }

            if (student) {
              attendanceData.push({
                student_id: student.id,
                session_id: session.id,
                present,
                import_id: importLog.id,
                marked_by: userProfile.email
              });
            } else {
              skippedCount++;
            }
          }

          if (attendanceData.length > 0) {
            const { error: attError } = await supabase
              .from('attendance')
              .upsert(attendanceData, { onConflict: 'student_id,session_id' });
            
            if (attError) {
              console.error('Attendance batch error:', attError);
              skippedCount += attendanceData.length;
            } else {
              importedCount += attendanceData.length;
            }
          }
          
          setImportProgress(prev => ({ ...prev, current: prev.current + studentRows.length }));
        }
      }

      // Update Import Log
      await supabase
        .from('import_log')
        .update({
          imported_rows: importedCount,
          skipped_rows: skippedCount,
          status: 'completed'
        })
        .eq('id', importLog.id);

      setStep(6);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSuggestedDatesForSheet = (sheetName, daysInWeek, startDate) => {
    // Basic logic to generate dates based on schedule
    const dates = {};
    const missingInSheet = missingDates.filter(m => m.sheetName === sheetName);
    
    let current = new Date(startDate);
    let count = 0;
    while (count < missingInSheet.length) {
      const dayName = current.toLocaleDateString('en-US', { weekday: 'long' });
      if (daysInWeek.includes(dayName)) {
        const dateStr = current.toISOString().split('T')[0];
        dates[`${sheetName}-${missingInSheet[count].index}`] = dateStr;
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    setSuggestedDates(prev => ({ ...prev, ...dates }));
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-base/40 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-2xl">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-accent-primary/20 rounded-2xl ring-1 ring-accent-primary/30">
            <Upload className="w-8 h-8 text-accent-primary" />
          </div>
          <div>
            <h1 className="text-display-sm font-bold text-fg-primary tracking-tight">Bulk Attendance Upload</h1>
            <p className="text-fg-secondary mt-1">AI-powered spreadsheet processing and gap filling</p>
          </div>
        </div>
        
        {/* Progress Steps */}
        <div className="flex items-center gap-3 bg-void/30 p-2 rounded-2xl border border-white/5">
          {[1, 2, 3, 4, 5].map((s) => (
            <div 
              key={s}
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                step === s 
                  ? 'bg-accent-primary text-void shadow-lg shadow-accent-primary/20 scale-110' 
                  : step > s 
                    ? 'bg-success/20 text-success border border-success/30' 
                    : 'bg-white/5 text-fg-tertiary border border-white/10'
              }`}
            >
              {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/30 p-4 rounded-2xl flex items-start gap-4 animate-in slide-in-from-top-4">
          <AlertCircle className="w-6 h-6 text-danger shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-danger">Error Occurred</h3>
            <p className="text-fg-secondary text-sm">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-fg-tertiary hover:text-fg-primary transition-colors">
            <ChevronRight className="w-5 h-5 rotate-90" />
          </button>
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 1 && (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="group relative h-[450px] border-2 border-dashed border-white/10 hover:border-accent-primary/50 rounded-[40px] flex flex-col items-center justify-center transition-all duration-500 cursor-pointer overflow-hidden bg-void/20 hover:bg-void/40"
        >
          {/* Background Decorative Elements */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-primary/5 blur-[120px] rounded-full group-hover:bg-accent-primary/10 transition-all duration-700" />
          
          <div className="relative flex flex-col items-center text-center p-8">
            <div className="w-24 h-24 bg-white/5 rounded-[32px] flex items-center justify-center mb-8 ring-1 ring-white/10 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 group-hover:ring-accent-primary/40 group-hover:bg-accent-primary/10">
              <FileSpreadsheet className="w-12 h-12 text-fg-tertiary group-hover:text-accent-primary" />
            </div>
            <h2 className="text-h2 text-fg-primary mb-3">Drop your attendance sheet</h2>
            <p className="text-fg-secondary max-w-sm mx-auto mb-8 text-body-lg">
              Supports Excel (.xlsx) and CSV files. We'll use AI to understand your custom formatting.
            </p>
            <button className="btn-primary flex items-center gap-3 px-8 py-4 text-lg">
              <Upload className="w-6 h-6" />
              Choose File
            </button>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".xlsx,.xls,.csv" 
            className="hidden" 
          />
        </div>
      )}

      {/* Step 2: Select Sheets */}
      {step === 2 && (
        <div className="space-y-6 animate-in slide-in-from-bottom-8">
          <div className="flex items-center justify-between">
            <h2 className="text-h2 text-fg-primary">Select Sheets to Process</h2>
            <button 
              onClick={analyzeWithAI}
              disabled={selectedSheets.length === 0}
              className="btn-primary px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sheetNames.map(name => (
              <div 
                key={name}
                onClick={() => toggleSheetSelection(name)}
                className={`p-6 rounded-3xl border transition-all duration-300 cursor-pointer flex items-center justify-between group ${
                  selectedSheets.includes(name) 
                    ? 'bg-accent-primary/10 border-accent-primary ring-1 ring-accent-primary/30' 
                    : 'bg-surface-base/20 border-white/10 hover:border-white/30'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${selectedSheets.includes(name) ? 'bg-accent-primary/20 text-accent-primary' : 'bg-white/5 text-fg-tertiary'}`}>
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <span className={`font-semibold ${selectedSheets.includes(name) ? 'text-accent-primary' : 'text-fg-secondary group-hover:text-fg-primary'}`}>
                    {name}
                  </span>
                </div>
                {selectedSheets.includes(name) && <CheckCircle2 className="w-6 h-6 text-accent-primary" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[100] bg-void/80 backdrop-blur-xl flex items-center justify-center">
          <div className="max-w-md w-full p-8 text-center space-y-6">
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 bg-accent-primary/20 blur-2xl rounded-full animate-pulse" />
              <Loader2 className="w-24 h-24 text-accent-primary animate-spin relative z-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-h3 text-fg-primary">{status}</h3>
              <p className="text-fg-secondary">This might take a few moments depending on the data size.</p>
            </div>
            {importProgress.total > 0 && (
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                <div 
                  className="h-full bg-accent-primary transition-all duration-300"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: AI Mapping Review & Date Resolution */}
      {step === 3 && !loading && (
        <div className="space-y-8 animate-in slide-in-from-bottom-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-h2 text-fg-primary">AI Analysis Results</h2>
              <p className="text-fg-secondary">Review how the AI mapped your data fields</p>
            </div>
            <button 
              onClick={handleDateResolution}
              className="btn-primary px-8 py-3 flex items-center gap-2"
            >
              Continue to Validation
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Field Mappings */}
            <div className="space-y-6">
              {mappingResult?.map((res, i) => (
                <div key={i} className="card-glass p-6 space-y-4">
                  <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                    <Database className="w-5 h-5 text-accent-primary" />
                    <h3 className="font-bold text-fg-primary">Sheet: {res.sheetName}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-void/20 rounded-2xl border border-white/5">
                      <p className="text-caption text-fg-tertiary mb-1 uppercase tracking-wider">USN Field</p>
                      <p className="font-semibold text-fg-primary">Column {res.mapping.usnColumnIndex + 1}</p>
                    </div>
                    <div className="p-4 bg-void/20 rounded-2xl border border-white/5">
                      <p className="text-caption text-fg-tertiary mb-1 uppercase tracking-wider">Name Field</p>
                      <p className="font-semibold text-fg-primary">Column {res.mapping.nameColumnIndex + 1}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-caption text-fg-tertiary uppercase tracking-wider px-1">Detected Sessions</p>
                    <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                      {res.mapping.attendanceColumns.map((col, j) => (
                        <div key={j} className="flex items-center justify-between p-3 bg-surface-base/20 rounded-xl border border-white/5 group hover:border-accent-primary/30 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-void/40 flex items-center justify-center text-xs font-mono text-fg-tertiary">
                              {col.index + 1}
                            </div>
                            <span className="text-sm text-fg-secondary font-medium">{col.label || `Session ${j+1}`}</span>
                          </div>
                          {col.date ? (
                            <div className="flex items-center gap-2 text-success text-xs font-semibold bg-success/10 px-3 py-1 rounded-full border border-success/20">
                              <Calendar className="w-3 h-3" />
                              {col.date}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-warning text-xs font-semibold bg-warning/10 px-3 py-1 rounded-full border border-warning/20">
                              <AlertCircle className="w-3 h-3" />
                              Missing Date
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Gap Filling Section */}
            {missingDates.length > 0 && (
              <div className="card-glass p-8 border-warning/20 bg-warning/5 space-y-6">
                <div className="flex items-center gap-3 text-warning">
                  <div className="p-3 bg-warning/20 rounded-2xl">
                    <History className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-h3 font-bold text-fg-primary">Gap Filling Required</h3>
                    <p className="text-fg-secondary text-sm">Some sessions are missing dates in the header</p>
                  </div>
                </div>

                <div className="space-y-6 bg-void/40 p-6 rounded-[32px] border border-white/10 shadow-inner">
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-fg-primary ml-1">What days in a week is this class usually taken?</label>
                    <div className="flex flex-wrap gap-2">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                        <button
                          key={day}
                          onClick={() => {
                            const newDays = scheduleInfo.days.includes(day) 
                              ? scheduleInfo.days.filter(d => d !== day)
                              : [...scheduleInfo.days, day];
                            setScheduleInfo(prev => ({ ...prev, days: newDays }));
                          }}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            scheduleInfo.days.includes(day)
                              ? 'bg-accent-primary text-void shadow-lg shadow-accent-primary/20'
                              : 'bg-white/5 text-fg-tertiary border border-white/10 hover:border-white/30'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-fg-primary ml-1">When did the sessions in this sheet start?</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-fg-tertiary" />
                      <input 
                        type="date"
                        value={scheduleInfo.startDate}
                        onChange={(e) => setScheduleInfo(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full bg-surface-inset border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-fg-primary focus:ring-2 focus:ring-accent-primary/50 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <button 
                    disabled={scheduleInfo.days.length === 0 || !scheduleInfo.startDate}
                    onClick={() => {
                      mappingResult.forEach(res => {
                        getSuggestedDatesForSheet(res.sheetName, scheduleInfo.days, scheduleInfo.startDate);
                      });
                    }}
                    className="w-full btn-secondary py-4 font-bold disabled:opacity-50"
                  >
                    Generate Suggested Dates
                  </button>
                </div>

                {Object.keys(suggestedDates).length > 0 && (
                  <div className="space-y-3 animate-in fade-in duration-500">
                    <p className="text-sm font-semibold text-fg-primary flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      Suggested Dates Applied:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(suggestedDates).map(([key, date]) => (
                        <div key={key} className="text-xs bg-success/10 border border-success/20 text-success p-2 rounded-lg text-center font-mono">
                          {date}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Duplicate Warning */}
      {step === 4 && (
        <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-8">
          <div className="card-glass p-8 border-danger/30 bg-danger/5 space-y-6">
            <div className="flex items-center gap-4 text-danger">
              <div className="p-4 bg-danger/20 rounded-3xl">
                <AlertCircle className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-h2 font-bold text-fg-primary">Existing Data Detected</h2>
                <p className="text-fg-secondary">Attendance records already exist for the following dates:</p>
              </div>
            </div>

            <div className="space-y-3">
              {duplicates.map((dup, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-void/40 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-4">
                    <Calendar className="w-5 h-5 text-fg-tertiary" />
                    <div>
                      <p className="font-semibold text-fg-primary">{dup.date}</p>
                      <p className="text-xs text-fg-tertiary">{dup.topic}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-danger/80 bg-danger/10 px-3 py-1 rounded-full border border-danger/20">
                    Conflict
                  </span>
                </div>
              ))}
            </div>

            <div className="p-4 bg-surface-base/40 rounded-2xl border border-white/10 text-sm text-fg-secondary leading-relaxed">
              <Info className="w-4 h-4 inline-block mr-2 text-accent-primary" />
              Proceeding will <strong>overwrite</strong> existing records for these dates. Ensure you have the correct spreadsheet version.
            </div>

            <div className="flex gap-4">
              <button onClick={() => setStep(3)} className="flex-1 btn-secondary py-4 font-bold">
                Go Back & Fix
              </button>
              <button onClick={proceedToFinalReview} className="flex-1 btn-primary py-4 font-bold bg-danger hover:bg-danger/80 shadow-danger/20">
                Overwrite & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Final Review */}
      {step === 5 && (
        <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-8 text-center">
          <div className="p-10 card-glass space-y-8 relative overflow-hidden">
             {/* Decorative background glow */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-accent-primary/5 to-transparent pointer-events-none" />
            
            <div className="relative z-10 space-y-6">
              <div className="w-24 h-24 bg-accent-primary/10 rounded-[32px] flex items-center justify-center mx-auto ring-1 ring-accent-primary/30">
                <UserCheck className="w-12 h-12 text-accent-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-display-sm font-bold text-fg-primary">Ready to Import</h2>
                <p className="text-fg-secondary text-body-lg">
                  AI has successfully validated the mappings and dates.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 py-6">
                <div className="p-6 bg-void/30 rounded-[32px] border border-white/5">
                  <p className="text-caption text-fg-tertiary uppercase tracking-widest mb-2">Sheets</p>
                  <p className="text-h3 text-accent-primary font-bold">{selectedSheets.length}</p>
                </div>
                <div className="p-6 bg-void/30 rounded-[32px] border border-white/5">
                  <p className="text-caption text-fg-tertiary uppercase tracking-widest mb-2">Sessions</p>
                  <p className="text-h3 text-accent-primary font-bold">
                    {mappingResult.reduce((acc, curr) => acc + curr.mapping.attendanceColumns.length, 0)}
                  </p>
                </div>
              </div>

              <button onClick={startImport} className="w-full btn-primary py-5 text-xl font-bold group">
                Begin Import Process
                <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 6: Success */}
      {step === 6 && (
        <div className="max-w-2xl mx-auto text-center space-y-8 animate-in zoom-in duration-500">
          <div className="w-32 h-32 bg-success/20 rounded-full flex items-center justify-center mx-auto ring-4 ring-success/10">
            <CheckCircle2 className="w-16 h-16 text-success" />
          </div>
          <div className="space-y-4">
            <h2 className="text-display-md font-bold text-fg-primary">Import Complete!</h2>
            <p className="text-fg-secondary text-body-xl">
              All attendance records have been successfully synchronized with the database.
            </p>
          </div>
          
          <div className="flex justify-center gap-4">
            <button onClick={() => window.location.href = '/dashboard'} className="btn-secondary px-8 py-4">
              Return to Dashboard
            </button>
            <button onClick={() => setStep(1)} className="btn-primary px-8 py-4">
              Upload Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkAttendance;

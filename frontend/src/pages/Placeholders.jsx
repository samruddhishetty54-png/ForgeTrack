import React from 'react';

export const Dashboard = () => (
  <div className="card-hero flex flex-col justify-center min-h-[400px]">
    <h1 className="text-display-md text-fg-primary mb-2">Mentor Dashboard</h1>
    <p className="text-fg-secondary text-body-lg">Overview and quick stats go here.</p>
  </div>
);

export const MarkAttendance = () => (
  <div className="card-hero flex flex-col justify-center min-h-[400px]">
    <h1 className="text-display-md text-fg-primary mb-2">Mark Attendance</h1>
    <p className="text-fg-secondary text-body-lg">Attendance form and logic go here.</p>
  </div>
);

export const StudentHistory = () => (
  <div className="card-hero flex flex-col justify-center min-h-[400px]">
    <h1 className="text-display-md text-fg-primary mb-2">Student History</h1>
    <p className="text-fg-secondary text-body-lg">Student search and attendance heatmap go here.</p>
  </div>
);

export const MentorMaterials = () => (
  <div className="card-hero flex flex-col justify-center min-h-[400px]">
    <h1 className="text-display-md text-fg-primary mb-2">Materials (Mentor)</h1>
    <p className="text-fg-secondary text-body-lg">CRUD view for class materials goes here.</p>
  </div>
);

export const UploadCSV = () => (
  <div className="card-hero flex flex-col justify-center min-h-[400px]">
    <h1 className="text-display-md text-fg-primary mb-2">Upload CSV</h1>
    <p className="text-fg-secondary text-body-lg">AI-powered CSV import logic goes here.</p>
  </div>
);

export const MyAttendance = () => (
  <div className="card-hero flex flex-col justify-center min-h-[400px]">
    <h1 className="text-display-md text-fg-primary mb-2">My Attendance</h1>
    <p className="text-fg-secondary text-body-lg">Student's own attendance view goes here.</p>
  </div>
);

export const Upcoming = () => (
  <div className="card-hero flex flex-col justify-center min-h-[400px]">
    <h1 className="text-display-md text-fg-primary mb-2">Upcoming Sessions</h1>
    <p className="text-fg-secondary text-body-lg">Student's upcoming sessions view goes here.</p>
  </div>
);

export const StudentMaterials = () => (
  <div className="card-hero flex flex-col justify-center min-h-[400px]">
    <h1 className="text-display-md text-fg-primary mb-2">Materials</h1>
    <p className="text-fg-secondary text-body-lg">Read-only view of class materials goes here.</p>
  </div>
);

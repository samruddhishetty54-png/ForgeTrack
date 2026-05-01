import React from 'react';

const DevTokens = () => {
  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto space-y-12">
      <header className="mb-8">
        <h1 className="text-5xl font-heading font-bold text-textPrimary">Design System Tokens</h1>
        <p className="text-textSecondary mt-2">Visualizing the cosmic ForgeTrack aesthetic.</p>
      </header>

      {/* Colors */}
      <section className="glass-panel p-6">
        <h2 className="text-2xl font-heading mb-6 border-b border-white/10 pb-2">Colors</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="h-16 w-full rounded bg-base border border-white/10"></div>
            <p className="font-mono text-sm">base</p>
          </div>
          <div className="space-y-2">
            <div className="h-16 w-full rounded bg-surface border border-white/10"></div>
            <p className="font-mono text-sm">surface</p>
          </div>
          <div className="space-y-2">
            <div className="h-16 w-full rounded bg-primary shadow-glow-primary"></div>
            <p className="font-mono text-sm">primary</p>
          </div>
          <div className="space-y-2">
            <div className="h-16 w-full rounded bg-secondary shadow-glow-secondary"></div>
            <p className="font-mono text-sm">secondary</p>
          </div>
        </div>
      </section>

      {/* Typography */}
      <section className="glass-panel p-6">
        <h2 className="text-2xl font-heading mb-6 border-b border-white/10 pb-2">Typography</h2>
        <div className="space-y-6">
          <div>
            <p className="text-sm text-textSecondary font-mono mb-1">Heading (Satoshi)</p>
            <h1 className="text-4xl font-heading">The quick brown fox jumps over the lazy dog</h1>
          </div>
          <div>
            <p className="text-sm text-textSecondary font-mono mb-1">Body (Inter)</p>
            <p className="text-base font-body">The quick brown fox jumps over the lazy dog. Sphynx of black quartz, judge my vow.</p>
          </div>
        </div>
      </section>

      {/* Components */}
      <section className="glass-panel p-6">
        <h2 className="text-2xl font-heading mb-6 border-b border-white/10 pb-2">UI Components</h2>
        <div className="space-y-6">
          <div className="flex gap-4">
            <button className="btn-primary animate-float">Primary Button (Float)</button>
            <button className="btn-secondary">Secondary Button</button>
            <button className="btn-primary" disabled>Disabled</button>
          </div>
          
          <div className="max-w-md">
            <label className="block text-sm font-medium mb-2 text-textSecondary">Input Field</label>
            <input type="text" className="input-field" placeholder="Enter some text..." />
          </div>
        </div>
      </section>
    </div>
  );
};

export default DevTokens;

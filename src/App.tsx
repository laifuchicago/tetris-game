/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import TetrisBoard from './components/TetrisBoard';

export default function App() {
  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col overflow-x-hidden select-none relative">
      {/* Subtle background radial grids */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Geometric Balance Header */}
      <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 md:px-12 bg-slate-900/50 relative z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-blue-500 rounded-xs shadow-md shadow-blue-500/20"></div>
          <h1 className="text-xl md:text-2xl font-black tracking-tighter uppercase text-white">
            TETRIS <span className="text-blue-500">ENGINE</span>
          </h1>
        </div>
        <div className="flex items-center gap-4 md:gap-8 text-[10px] md:text-xs font-bold tracking-widest uppercase text-slate-500">
          <div>Status: <span className="text-green-500">ACTIVE</span></div>
          <div>Engine: <span className="text-slate-300">v2.4.0</span></div>
        </div>
      </header>

      {/* Main interactive viewport container */}
      <main className="flex-1 flex flex-col justify-center py-6 md:py-10 px-4 relative z-10 overflow-y-auto">
        <TetrisBoard />
      </main>

      {/* Geometric Balance Footer */}
      <footer className="h-12 border-t border-slate-800 flex items-center justify-center px-6 md:px-12 bg-slate-900/50 text-[10px] text-slate-500 uppercase tracking-[0.2em] relative z-20 shrink-0 text-center">
        &copy; 2026 Geometry Labs &mdash; Procedural Block Simulation
      </footer>
    </div>
  );
}


/**
 * data.js
 * Loads, cleans, and exposes the EHM regulatory survey dataset.
 * Scope: DNV + DOH findings, 2023–2026, Evergreen Health Monroe.
 */

(function () {
  'use strict';

  /* ── Compliance theme clusters ────────────────── */
  const THEMES = [
    {
      key: 'fire_life_safety',
      label: 'Fire & Life Safety',
      keywords: ['fire', 'sprinkler', 'lsm', 'nfpa', 'egress', 'exit', 'extinguisher',
                 'smoke', 'alarm', 'penetration', 'fire door', 'fire watch', 'fire drill',
                 'fire panel', 'fire wall', 'life safety', 'fire safety', 'hood system',
                 'fire drills', 'life safety code']
    },
    {
      key: 'documentation',
      label: 'Documentation & Records',
      keywords: ['document', 'record', 'policy', 'p&p', 'pnp', 'written', 'evidence',
                 'objective evidence', 'log', 'report', 'h&p', 'operative note',
                 'anesthesia note', 'consent', 'no evidence', 'missing', 'failed to maintain',
                 'not utd', 'delineation']
    },
    {
      key: 'staffing_training',
      label: 'Staffing & Training',
      keywords: ['training', 'competency', 'orientation', 'staff', 'education',
                 'personnel', 'certified', 'certification', 'credential', 'background check',
                 'fit test', 'proficiency', 'annual review', 'performance eval', 'lockdown',
                 'tb screening', 'n95']
    },
    {
      key: 'physical_environment',
      label: 'Physical Environment & Utilities',
      keywords: ['electrical', 'utility', 'humidity', 'ventilation', 'nfpa 99',
                 'generator', 'medical gas', 'oxygen', 'compressed gas', 'lighting',
                 'receptacle', 'panel', 'eyewash', 'infrastructure', 'hazardous material',
                 'power strip', 'escutcheon', 'nitrogen', 'bulk oxygen', 'lims', 'leakage']
    },
    {
      key: 'medication_patient_care',
      label: 'Medication & Patient Care',
      keywords: ['med ', 'medication', 'drug', 'narcotic', 'blood product', 'transfusion',
                 'restraint', 'nursing', 'patient', 'iv ', 'pharmaceutical', 'infusion',
                 'si ', 'suicide', 'pain', 'telemetry', 'iuss', 'intravenous']
    },
    {
      key: 'infection_control',
      label: 'Infection Control',
      keywords: ['infection', 'aseptic', 'sterile', 'hand hygiene', 'handwash',
                 'ppe', 'garb', 'attire', 'surgical attire', 'barrier', 'contamination',
                 'disinfect', 'clean', 'shipping box']
    },
    {
      key: 'clinical_governance',
      label: 'Clinical Governance & Medical Staff',
      keywords: ['medical staff', 'med staff', 'governing body', 'leadership',
                 'contracted', 'oversight', 'quality', 'audit', 'performance data',
                 'privileges', 'credentialing', 'ems', 'anesthesia', 'surgical',
                 'operative', 'h&p', 'delineation', 'board']
    },
  ];

  function assignTheme(row) {
    const haystack = `${row.department} ${row.description}`.toLowerCase();
    let best = null, bestScore = 0;
    for (const theme of THEMES) {
      const score = theme.keywords.reduce(
        (acc, kw) => acc + (haystack.includes(kw) ? 1 : 0), 0
      );
      if (score > bestScore) { bestScore = score; best = theme; }
    }
    return best ? best.key : 'other';
  }

  function themeLabel(key) {
    const t = THEMES.find(t => t.key === key);
    return t ? t.label : 'Other';
  }

  function loadData() {
    return d3.csv('data/regulatorySurvey.csv', row => ({
      year:        +row.year,
      body:        row.body.trim(),
      department:  row.department.trim(),
      description: row.description.trim(),
    })).then(raw => {

      const data = raw.map(d => ({ ...d, theme: assignTheme(d) }));

      const byYear = d3.rollups(data, v => v.length, d => d.year)
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => a.year - b.year);

      const byBody = d3.rollups(data, v => v.length, d => d.body)
        .map(([body, count]) => ({ body, count }))
        .sort((a, b) => b.count - a.count);

      const byDept = d3.rollups(
          data.filter(d => d.department !== 'Unknown'),
          v => v.length, d => d.department
        )
        .map(([department, count]) => ({ department, count }))
        .sort((a, b) => b.count - a.count);

      const byTheme = d3.rollups(data, v => v.length, d => d.theme)
        .map(([theme, count]) => ({ theme, label: themeLabel(theme), count }))
        .sort((a, b) => b.count - a.count);

      const years       = [...new Set(data.map(d => d.year))].sort((a,b) => a - b);
      const departments = [...new Set(data.map(d => d.department))]
        .filter(d => d && d !== 'Unknown').sort();
      const bodies      = ['DNV', 'DOH'];

      window.AppData = {
        raw, data, byYear, byBody, byDept, byTheme,
        years, departments, bodies, THEMES, themeLabel,
      };
    });
  }

  window.loadData = loadData;
})();

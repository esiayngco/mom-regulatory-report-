/**
 * interactions.js
 * Global filter state, cross-chart communication, and table logic.
 * EHM scope: DNV + DOH, 2023–2026.
 */

(function () {
  'use strict';

  const state = {
    year: null, body: null, department: null,
    keyword: '', deptSort: 'count',
    repeatSearch: '', repeatSort: 'count',
    tableSortCol: 'year', tableSortDir: 'asc',
    tablePage: 1, PAGE_SIZE: 15,
  };

  function filteredData() {
    return window.AppData.data.filter(d => {
      if (state.year       && d.year       !== state.year)       return false;
      if (state.body       && d.body       !== state.body)       return false;
      if (state.department && d.department !== state.department) return false;
      return true;
    });
  }

  function refresh() {
    const fd = filteredData();
    window.AppCharts.drawKPIs(fd);
    window.AppCharts.drawTimeChart(fd, state.year);
    window.AppCharts.drawBodiesChart(fd, state.body);
    window.AppCharts.drawDeptsChart(fd, state.deptSort, state.department);
    window.AppCharts.drawRepeatChart(fd, state.repeatSearch, state.repeatSort);
    renderTable(fd);
    updateFilterBar();
    syncDropdowns();
  }

  function setFilter(key, value) {
    state[key] = (state[key] === value) ? null : value;
    state.tablePage = 1;
    refresh();
  }

  function clearAllFilters() {
    state.year = null; state.body = null; state.department = null;
    state.keyword = ''; state.tablePage = 1;
    document.getElementById('table-search').value = '';
    document.getElementById('filter-body').value  = '';
    document.getElementById('filter-dept').value  = '';
    document.getElementById('filter-year').value  = '';
    refresh();
  }

  function updateFilterBar() {
    const bar = document.getElementById('filter-bar');
    const label = document.getElementById('filter-text');
    const parts = [];
    if (state.year)       parts.push(`Year: ${state.year}`);
    if (state.body)       parts.push(`Body: ${state.body}`);
    if (state.department) parts.push(`Dept: ${state.department}`);
    if (parts.length) {
      label.textContent = parts.join(' · ');
      bar.classList.remove('hidden');
    } else {
      bar.classList.add('hidden');
    }
  }

  function syncDropdowns() {
    if (state.body)       document.getElementById('filter-body').value = state.body;
    if (state.year)       document.getElementById('filter-year').value = String(state.year);
    if (state.department) document.getElementById('filter-dept').value = state.department;
  }

  /* ── TABLE ──────────────────────────────────── */
  function renderTable(fd) {
    const kw = state.keyword.toLowerCase();
    let rows = fd.filter(d =>
      !kw ||
      d.description.toLowerCase().includes(kw) ||
      d.department.toLowerCase().includes(kw) ||
      d.body.toLowerCase().includes(kw) ||
      String(d.year).includes(kw)
    );

    rows = [...rows].sort((a,b) => {
      let av = a[state.tableSortCol];
      let bv = b[state.tableSortCol];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return state.tableSortDir === 'asc' ? -1 :  1;
      if (av > bv) return state.tableSortDir === 'asc' ?  1 : -1;
      return 0;
    });

    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / state.PAGE_SIZE));
    state.tablePage = Math.min(state.tablePage, pages);
    const start = (state.tablePage - 1) * state.PAGE_SIZE;
    const paged = rows.slice(start, start + state.PAGE_SIZE);

    document.getElementById('table-count').textContent =
      `${total.toLocaleString()} finding${total !== 1 ? 's' : ''}`;

    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';
    paged.forEach(d => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${d.year}</td>
        <td><span class="body-badge ${d.body}">${d.body}</span></td>
        <td>${d.department || '—'}</td>
        <td>${escHtml(d.description)}</td>
      `;
      tbody.appendChild(tr);
    });

    renderPagination(pages);
  }

  function renderPagination(pages) {
    const el = document.getElementById('table-pagination');
    el.innerHTML = '';
    if (pages <= 1) return;
    const cp = state.tablePage;

    const addBtn = (label, page, active) => {
      const btn = document.createElement('button');
      btn.className = 'page-btn' + (active ? ' active' : '');
      btn.textContent = label;
      if (!active) btn.onclick = () => {
        state.tablePage = page;
        refresh();
        document.getElementById('table-section').scrollIntoView({ behavior:'smooth', block:'start' });
      };
      el.appendChild(btn);
    };

    addBtn('‹', cp-1, cp===1);
    const s = Math.max(1, cp-3), e = Math.min(pages, cp+3);
    for (let p = s; p <= e; p++) addBtn(p, p, p===cp);
    addBtn('›', cp+1, cp===pages);
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Controls ────────────────────────────────── */
  function initControls() {
    const ad = window.AppData;

    // Populate dropdowns
    const deptSel = document.getElementById('filter-dept');
    ad.departments.forEach(dep => {
      const o = document.createElement('option');
      o.value = dep; o.textContent = dep;
      deptSel.appendChild(o);
    });

    const yearSel = document.getElementById('filter-year');
    ad.years.forEach(yr => {
      const o = document.createElement('option');
      o.value = yr; o.textContent = yr;
      yearSel.appendChild(o);
    });

    // Keyword search
    document.getElementById('table-search').addEventListener('input', e => {
      state.keyword = e.target.value; state.tablePage = 1; refresh();
    });

    // Dropdowns
    document.getElementById('filter-body').addEventListener('change', e => {
      state.body = e.target.value || null; state.tablePage = 1; refresh();
    });
    document.getElementById('filter-dept').addEventListener('change', e => {
      state.department = e.target.value || null; state.tablePage = 1; refresh();
    });
    document.getElementById('filter-year').addEventListener('change', e => {
      state.year = e.target.value ? +e.target.value : null; state.tablePage = 1; refresh();
    });

    // Clear filter banner
    document.getElementById('clear-filter').addEventListener('click', clearAllFilters);

    // Dept sort
    document.querySelectorAll('[data-sort]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.deptSort = btn.dataset.sort;
        document.querySelectorAll('[data-sort]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        refresh();
      });
    });

    // Repeat sort
    document.querySelectorAll('[data-rsort]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.repeatSort = btn.dataset.rsort;
        document.querySelectorAll('[data-rsort]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        refresh();
      });
    });

    // Repeat search
    document.getElementById('repeat-search').addEventListener('input', e => {
      state.repeatSearch = e.target.value; refresh();
    });

    // Table column sort
    document.querySelectorAll('#main-table th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (state.tableSortCol === col) {
          state.tableSortDir = state.tableSortDir === 'asc' ? 'desc' : 'asc';
        } else {
          state.tableSortCol = col; state.tableSortDir = 'asc';
        }
        document.querySelectorAll('#main-table th').forEach(h => h.classList.remove('sort-asc','sort-desc'));
        th.classList.add(`sort-${state.tableSortDir}`);
        state.tablePage = 1;
        refresh();
      });
    });

    // Resize
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(refresh, 200);
    });
  }

  window.AppInteractions = { setFilter, clearAllFilters, initControls, refresh };
})();

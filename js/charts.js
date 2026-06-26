/**
 * charts.js
 * D3 chart drawing functions for EHM Regulatory Survey (2023–2026, DNV + DOH).
 */

(function () {
  'use strict';

  /* ── Shared tooltip ───────────────────────────── */
  const tooltip = d3.select('body').append('div').attr('class', 'd3-tooltip');
  function showTooltip(html, event) {
    tooltip.html(html).classed('visible', true)
      .style('left', (event.clientX + 16) + 'px')
      .style('top',  (event.clientY - 36) + 'px');
  }
  function moveTooltip(event) {
    tooltip.style('left', (event.clientX + 16) + 'px')
           .style('top',  (event.clientY - 36) + 'px');
  }
  function hideTooltip() { tooltip.classed('visible', false); }

  /* ── Colors ───────────────────────────────────── */
  const BODY_COLOR = { DNV: '#4a6fa5', DOH: '#5a8a6a' };
  function bodyColor(b) { return BODY_COLOR[b] || '#888'; }
  const ACCENT = '#b5533c';

  /* ═══════════════════════════════════════════════
     1. KPI CARDS
  ════════════════════════════════════════════════ */
  function drawKPIs(data) {
    const total  = data.length;
    const depts  = new Set(data.filter(d => d.department !== 'Unknown').map(d => d.department)).size;
    const dnv    = data.filter(d => d.body === 'DNV').length;
    const doh    = data.filter(d => d.body === 'DOH').length;
    const years  = new Set(data.map(d => d.year)).size;

    const cards = [
      { label: 'Total Findings', value: total, sub: `across ${years} survey year${years!==1?'s':''}`, cls: 'accent' },
      { label: 'Departments',    value: depts, sub: 'unique departments cited',     cls: 'blue'  },
      { label: 'DNV Findings',   value: dnv,   sub: 'accreditation surveys',        cls: 'blue'  },
      { label: 'DOH Findings',   value: doh,   sub: 'state health department',      cls: 'green' },
    ];

    const grid = d3.select('#kpi-grid');
    grid.selectAll('.kpi-card').remove();

    const enter = grid.selectAll('.kpi-card')
      .data(cards).enter()
      .append('div').attr('class', d => `kpi-card ${d.cls}`);

    enter.append('div').attr('class', 'kpi-label').text(d => d.label);

    enter.append('div').attr('class', 'kpi-value')
      .each(function(d) {
        const el = d3.select(this);
        let cur = 0; const target = d.value;
        const dur = 800, step = 16, inc = target / (dur / step);
        const t = setInterval(() => {
          cur = Math.min(cur + inc, target);
          el.text(Math.round(cur));
          if (cur >= target) clearInterval(t);
        }, step);
      });

    enter.append('div').attr('class', 'kpi-sub').text(d => d.sub);
  }

  /* ═══════════════════════════════════════════════
     2. FINDINGS OVER TIME
  ════════════════════════════════════════════════ */
  function drawTimeChart(data, activeYear) {
    const el = document.getElementById('chart-time');
    if (!el) return;

    const margin = { top: 30, right: 28, bottom: 48, left: 48 };
    const W = el.clientWidth || 860;
    const H = 300;
    const iW = W - margin.left - margin.right;
    const iH = H - margin.top - margin.bottom;

    // Stack by body per year
    const years = ['2023','2024','2025','2026'];
    const bodies = ['DNV','DOH'];

    const nested = {};
    years.forEach(y => {
      nested[y] = { year: y };
      bodies.forEach(b => {
        nested[y][b] = data.filter(d => String(d.year) === y && d.body === b).length;
      });
    });
    const stackData = years.map(y => nested[y]);

    const stack = d3.stack().keys(bodies)(stackData);
    const maxVal = d3.max(stackData, d => (d.DNV||0) + (d.DOH||0)) * 1.15;

    d3.select(el).selectAll('svg').remove();
    const svg = d3.select(el).append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', W).attr('height', H);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(years).range([0, iW]).padding(.36);
    const y = d3.scaleLinear().domain([0, maxVal]).range([iH, 0]);

    // Grid
    g.append('g').attr('class','grid')
      .call(d3.axisLeft(y).ticks(5).tickSize(-iW).tickFormat(''))
      .call(g => g.select('.domain').remove());

    // Axes
    g.append('g').attr('class','axis axis-x')
      .attr('transform',`translate(0,${iH})`)
      .call(d3.axisBottom(x).tickSize(0).tickPadding(10))
      .call(g => g.select('.domain').remove());
    g.append('g').attr('class','axis axis-y')
      .call(d3.axisLeft(y).ticks(5).tickSize(0).tickPadding(8))
      .call(g => g.select('.domain').remove());

    // Stacked bars
    const layer = g.selectAll('.layer')
      .data(stack).enter().append('g')
        .attr('class', 'layer')
        .attr('fill', d => activeYear ? '#d4cfc8' : bodyColor(d.key));

    layer.selectAll('rect')
      .data(d => d).enter()
      .append('rect')
        .attr('class','bar-rect')
        .attr('x', d => x(d.data.year))
        .attr('width', x.bandwidth())
        .attr('rx', 4)
        .attr('y', iH).attr('height', 0)
        .attr('fill', function() {
          const body = d3.select(this.parentNode).datum().key;
          const yr   = d3.select(this).datum().data.year;
          if (activeYear && String(activeYear) !== yr) return '#d4cfc8';
          return bodyColor(body);
        })
        .on('mouseover', (event, d) => {
          const yr = d.data.year;
          showTooltip(
            `<strong>${yr}</strong>DNV: ${d.data.DNV||0} &nbsp;·&nbsp; DOH: ${d.data.DOH||0}<br>Total: ${(d.data.DNV||0)+(d.data.DOH||0)}`,
            event
          );
        })
        .on('mousemove', moveTooltip)
        .on('mouseleave', hideTooltip)
        .on('click', (event, d) => {
          window.AppInteractions.setFilter('year', +d.data.year);
        })
        .transition().duration(600).delay((d,i) => i * 60)
          .attr('y', d => y(d[1]))
          .attr('height', d => y(d[0]) - y(d[1]));

    // Total labels on top
    stackData.forEach(d => {
      const tot = (d.DNV||0) + (d.DOH||0);
      if (!tot) return;
      g.append('text')
        .attr('x', x(d.year) + x.bandwidth() / 2)
        .attr('y', y(tot) - 6)
        .attr('text-anchor','middle')
        .attr('font-size', 11)
        .attr('fill','#6b7280')
        .text(tot);
    });

    // Legend
    const leg = svg.append('g').attr('transform', `translate(${margin.left + iW - 90},${margin.top - 20})`);
    bodies.forEach((b, i) => {
      leg.append('rect').attr('x', i * 52).attr('y', 0).attr('width', 10).attr('height', 10)
        .attr('rx', 2).attr('fill', bodyColor(b));
      leg.append('text').attr('x', i * 52 + 14).attr('y', 9)
        .attr('font-size', 11).attr('fill','#6b7280').text(b);
    });
  }

  /* ═══════════════════════════════════════════════
     3. DNV vs DOH
  ════════════════════════════════════════════════ */
  function drawBodiesChart(data, activeBody) {
    const el = document.getElementById('chart-bodies');
    if (!el) return;

    const byBody = ['DNV','DOH'].map(b => ({
      body: b,
      count: data.filter(d => d.body === b).length
    }));

    const margin = { top: 20, right: 120, bottom: 20, left: 70 };
    const W = el.clientWidth || 860;
    const ROW_H = 56;
    const H = byBody.length * ROW_H + margin.top + margin.bottom;
    const iW = W - margin.left - margin.right;
    const iH = H - margin.top - margin.bottom;

    d3.select(el).selectAll('svg').remove();
    const svg = d3.select(el).append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', W).attr('height', H);
    const g = svg.append('g').attr('transform',`translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, d3.max(byBody, d => d.count) * 1.15]).range([0, iW]);
    const y = d3.scaleBand().domain(byBody.map(d => d.body)).range([0, iH]).padding(.28);

    // Track
    g.selectAll('.bar-track').data(byBody).enter()
      .append('rect')
        .attr('x',0).attr('y', d => y(d.body))
        .attr('width', iW).attr('height', y.bandwidth())
        .attr('rx', 4).attr('fill','#f3f1ee');

    // Bars
    const bars = g.selectAll('.bar-rect').data(byBody).enter()
      .append('rect')
        .attr('class','bar-rect')
        .attr('x',0).attr('y', d => y(d.body))
        .attr('height', y.bandwidth()).attr('rx', 4)
        .attr('width', 0)
        .attr('fill', d => activeBody && activeBody !== d.body ? '#d4cfc8' : bodyColor(d.body));

    bars.transition().duration(700).delay((d,i) => i*100)
      .attr('width', d => x(d.count));

    // Body label
    g.selectAll('.body-label').data(byBody).enter()
      .append('text')
        .attr('x', -10).attr('y', d => y(d.body) + y.bandwidth()/2)
        .attr('dy','.35em').attr('text-anchor','end')
        .attr('font-size', 14).attr('font-weight', 700)
        .attr('fill', d => bodyColor(d.body))
        .text(d => d.body);

    // Count + pct label
    const total = data.length || 1;
    g.selectAll('.bar-count').data(byBody).enter()
      .append('text')
        .attr('x', d => x(d.count) + 10)
        .attr('y', d => y(d.body) + y.bandwidth()/2)
        .attr('dy','.35em').attr('font-size', 13).attr('fill','#444')
        .text(d => `${d.count}  (${Math.round(d.count/total*100)}%)`);

    bars
      .on('mouseover', (event, d) => showTooltip(
        `<strong>${d.body}</strong>${d.count} findings`, event
      ))
      .on('mousemove', moveTooltip)
      .on('mouseleave', hideTooltip)
      .on('click', (event, d) => window.AppInteractions.setFilter('body', d.body));
  }

  /* ═══════════════════════════════════════════════
     4. DEPARTMENTS
  ════════════════════════════════════════════════ */
  function drawDeptsChart(data, sortMode, activeDept) {
    const el = document.getElementById('chart-depts');
    if (!el) return;

    let byDept = d3.rollups(
        data.filter(d => d.department && d.department !== 'Unknown'),
        v => v.length, d => d.department
      ).map(([department, count]) => ({ department, count }));

    if (sortMode === 'name') byDept.sort((a,b) => a.department.localeCompare(b.department));
    else byDept.sort((a,b) => b.count - a.count);

    const margin = { top: 16, right: 72, bottom: 16, left: 210 };
    const W = el.clientWidth || 860;
    const ROW_H = 36;
    const H = byDept.length * ROW_H + margin.top + margin.bottom;
    const iW = W - margin.left - margin.right;
    const iH = H - margin.top - margin.bottom;

    d3.select(el).selectAll('svg').remove();
    const svg = d3.select(el).append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', W).attr('height', H);
    const g = svg.append('g').attr('transform',`translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, d3.max(byDept, d => d.count) * 1.14]).range([0, iW]);
    const y = d3.scaleBand().domain(byDept.map(d => d.department)).range([0, iH]).padding(.2);

    g.selectAll('.dept-label').data(byDept).enter()
      .append('text')
        .attr('x',-8).attr('y', d => y(d.department)+y.bandwidth()/2)
        .attr('dy','.35em').attr('text-anchor','end')
        .attr('font-size',11).attr('fill','#444')
        .text(d => d.department.length > 28 ? d.department.slice(0,26)+'…' : d.department);

    const bars = g.selectAll('.bar-rect').data(byDept).enter()
      .append('rect')
        .attr('class','bar-rect')
        .attr('x',0).attr('y', d => y(d.department))
        .attr('height', y.bandwidth()).attr('rx',3)
        .attr('width',0)
        .attr('fill', d => activeDept && activeDept !== d.department ? '#d4cfc8' : '#4a6fa5');

    bars.transition().duration(550).delay((d,i) => i*25)
      .attr('width', d => x(d.count));

    g.selectAll('.dept-count').data(byDept).enter()
      .append('text')
        .attr('x', d => x(d.count)+6).attr('y', d => y(d.department)+y.bandwidth()/2)
        .attr('dy','.35em').attr('font-size',11).attr('fill','#6b7280')
        .text(d => d.count);

    bars
      .on('mouseover',(event,d) => showTooltip(`<strong>${d.department}</strong>${d.count} findings`, event))
      .on('mousemove', moveTooltip)
      .on('mouseleave', hideTooltip)
      .on('click',(event,d) => window.AppInteractions.setFilter('department', d.department));
  }

  /* ═══════════════════════════════════════════════
     5. REPEAT FINDINGS — themed cards
  ════════════════════════════════════════════════ */
  function drawRepeatChart(data, searchTerm, sortMode) {
    const el = document.getElementById('chart-repeat');
    if (!el) return;
    const ad = window.AppData;

    let byTheme = d3.rollups(data, v => v.length, d => d.theme)
      .map(([theme, count]) => ({
        theme,
        label: ad.themeLabel(theme),
        count,
        depts: [...new Set(data.filter(d=>d.theme===theme).map(d=>d.department))]
               .filter(Boolean).slice(0,4),
        years: [...new Set(data.filter(d=>d.theme===theme).map(d=>d.year))].sort(),
      }));

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      byTheme = byTheme.filter(d =>
        d.label.toLowerCase().includes(q) ||
        d.depts.some(dep => dep.toLowerCase().includes(q))
      );
    }

    if (sortMode === 'alpha') byTheme.sort((a,b) => a.label.localeCompare(b.label));
    else byTheme.sort((a,b) => b.count - a.count);

    const maxCount = d3.max(byTheme, d => d.count) || 1;

    d3.select(el).selectAll('.repeat-grid').remove();
    const grid = d3.select(el).append('div').attr('class','repeat-grid');

    byTheme.forEach((d, i) => {
      const card = grid.append('div')
        .attr('class','repeat-card')
        .style('animation', `fadeUp .35s ease ${i * 0.05}s both`);

      const header = card.append('div').attr('class','repeat-card-header');
      header.append('div').attr('class','repeat-card-theme').text(d.label);
      header.append('div').attr('class','repeat-card-count').text(`${d.count}×`);

      const wrap = card.append('div').attr('class','repeat-card-bar-wrap');
      wrap.append('div').attr('class','repeat-card-bar')
        .style('width', `${(d.count/maxCount*100).toFixed(1)}%`);

      // Year dots
      const yearRow = card.append('div').attr('class','repeat-card-years');
      d.years.forEach(yr => {
        yearRow.append('span').attr('class','repeat-card-year').text(yr);
      });

      const tags = card.append('div').attr('class','repeat-card-tags');
      d.depts.forEach(dep => {
        tags.append('span').attr('class','repeat-card-tag').text(dep);
      });
    });

    if (byTheme.length === 0) {
      d3.select(el).append('p')
        .style('text-align','center').style('color','#6b7280').style('padding','40px 0')
        .text('No themes match your search.');
    }
  }

  window.AppCharts = { drawKPIs, drawTimeChart, drawBodiesChart, drawDeptsChart, drawRepeatChart };
})();

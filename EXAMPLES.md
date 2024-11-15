# Examples

## Make google.com your interactive HTML playground

1. Go to [google.com](https://google.com)
2. Install `use-m`:
   ```js
   const { use } = await import("https://esm.sh/use-m");
   ```
3. Use (import) `d3`:
   ```js
   const d3 = await use('d3');
   ```
4. Clean page's body:
   ```js
   document.body.innerHTML = '<svg></svg>';
   ```
5. Draw a curved arrow
   ```js
   const svg = d3.select("svg")
     .attr("width", "100%")
     .attr("height", "100%")
     .attr("viewBox", "0 0 220 220");
   
   svg.append("defs").append("marker")
     .attr("id", "arrow")
     .attr("markerWidth", 20)
     .attr("markerHeight", 20)
     .attr("refX", 12)
     .attr("refY", 6)
     .attr("orient", "auto")
     .append("path")
     .attr("d", "M0,0 L0,12 L12,6 Z")
     .attr("fill", "white");
   
   svg.append("path")
     .attr("d", "M10,10 Q100,200 200,10")
     .attr("stroke", "white")
     .attr("fill", "none")
     .attr("marker-end", "url(#arrow)");
   ```
















import{r as l,j as s}from"./index-DUjDhAw2.js";import{T as p,R as m,S as j,C as d,a as y,O as f,E as h}from"./ui-C0YRGEy8.js";import{p as x,s as g}from"./public-api-DXLc6jqh.js";function k(e,a=2){if(!e.trim())return{ok:!0,output:"",documents:0};const t=x(e);if(!Array.isArray(t))return{ok:!0,output:"",documents:0};for(const r of t)if(r.errors.length)return{ok:!1,error:r.errors[0].message};let o;try{o=t.map(r=>r.toJS({maxAliasCount:100}))}catch(r){return{ok:!1,error:r.message}}const u=o.length===1?o[0]:o;return{ok:!0,output:JSON.stringify(u,null,a),documents:o.length}}const i=e=>g(e,{version:"1.1"});function S(e,a=!1){if(!e.trim())return{ok:!0,output:"",documents:0};try{const t=JSON.parse(e);return a&&Array.isArray(t)?{ok:!0,output:t.map(i).join(`---
`),documents:t.length}:{ok:!0,output:i(t),documents:1}}catch(t){return{ok:!1,error:t.message.split(`
`)[0]}}}const A=`apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: api
          image: ghcr.io/example/api:1.4.2
          ports:
            - containerPort: 8080
`;function b(){const[e,a]=l.useState("y2j"),[t,o]=l.useState(A),[u,r]=l.useState(!0),n=l.useMemo(()=>e==="y2j"?k(t):S(t,u),[e,t,u]),c=()=>{n.ok&&o(n.output),a(e==="y2j"?"j2y":"y2j")};return s.jsxs(s.Fragment,{children:[s.jsx(p,{slug:"yaml-json"}),s.jsxs(m,{children:[s.jsx(j,{label:"Direction",value:e,onChange:a,options:[["y2j","YAML → JSON"],["j2y","JSON → YAML"]]}),e==="j2y"&&s.jsx(d,{label:"Top-level array → multiple documents",checked:u,onChange:r}),s.jsx("button",{type:"button",className:"btn",onClick:c,children:"Swap"})]}),s.jsxs("div",{className:"split",children:[s.jsx(y,{label:e==="y2j"?"YAML input":"JSON input",value:t,onChange:o,rows:18}),s.jsx(f,{label:e==="y2j"?"JSON output":"YAML output",value:n.ok?n.output:"",rows:18})]}),n.ok?n.documents>1&&s.jsxs("p",{className:"hint",children:[n.documents," documents"]}):s.jsx(h,{error:n.error})]})}export{b as default};

// Host half entry. DSH loads the package main; the implementation lives in
// src/host so the browser and host halves share one layout.
export { name, inject, apply } from './src/host/index.js'

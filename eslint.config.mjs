import nextVitals from "eslint-config-next/core-web-vitals.js";
import nextTypescript from "eslint-config-next/typescript.js";

const config = [...nextVitals, ...nextTypescript];

export default config;

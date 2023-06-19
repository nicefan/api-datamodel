import path from "path";
import { terser } from "@rollup/plugin-terser";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import ts from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";

const pkg = require("./package.json");
const name = pkg.name;
const dir = "dist";
const declarationDir = dir + "_types";
const banner = `/*!
  * ${pkg.name} v${pkg.version}
  * (c) ${new Date().getFullYear()} 范阳峰 covien@msn.com
  * @license MIT
  */`;

const tsPlugin = ts({
  lib: ["esnext", "dom"],
  target: "es2015",
  declaration: true,
  outDir: dir,
  declarationDir: declarationDir,
  // check: true,
  tsconfig: path.resolve(__dirname, "tsconfig.json"),
  // cacheRoot: path.resolve(__dirname, 'node_modules/.rts2_cache'),
  // tsconfigOverride: { compilerOptions: { declaration: false,declarationMap: false } }
});
const mainFile = "src/index.ts";
const input = [mainFile, "src/dataCache.ts"];
//   'index': mainFile,
//   'cacheRequest': "src/dataCache.ts"
// }

const es = {
  // input: mainFile,
  input,
  output: {
    banner,
    dir: ".",
    entryFileNames: dir + "/[name].js",
    format: "es",
  },
  plugins: [tsPlugin],
};

const types = {
  input: [`${declarationDir}/index.d.ts`],
  output: [
    {
      banner: `/// <reference types="../types" />`,
      dir: ".",
      entryFileNames: dir + "/[name].ts",
      format: "es",
    },
  ],
  plugins: [dts()],
};

const cjs = {
  input,
  output: {
    dir,
    banner,
    format: "cjs",
    entryFileNames: [name].cjs,
  },
  plugins: [commonjs()],
};

export default [es, types];

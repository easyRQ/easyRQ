const { spawn } = require("child_process");
const { resolve } = require("path");
const { parallel, watch, series } = require("gulp");
const color = require("ansi-colors");
const rrimraf = require("rimraf");

/**
 * @type {import("child_process").ChildProcess}
 */
let lastAppProcess = null;

const isWIN32 = process.platform === "win32";
const appBundleName = isWIN32 ? "easyrq.exe" : "easyrq";
const appDistDir = "build";

const spawnConfig = {
  stdio: "inherit",
  shell: isWIN32 ? "cmd" : false
};

function buildApp() {
  return spawn("go", ["build", "-i", "-o", `${appDistDir}/${appBundleName}`], {
    ...spawnConfig,
    cwd: resolve(__dirname, "./packages/cli")
  });
}

function runApp(...args) {
  return series([
    buildApp,
    cb => {
      lastAppProcess = spawn(
        resolve(__dirname, "./packages/cli", appDistDir, appBundleName),
        spawnConfig
      );
      cb();
    }
  ])(...args);
}

// automatically rebuild and re-launch after files change
function appDev(cb) {
  watch(
    "./packages/cli/**/*.go",
    { ignoreInitial: false, useFsEvents: true },
    series([
      cb => {
        if (lastAppProcess) {
          console.log(color.red(`will kill ${lastAppProcess.pid}`));
          lastAppProcess.kill();
        }
        cb();
      },
      runApp
    ])
  );

  cb();
}

function buildUI(cb) {
  spawn("npm", ["run", "build"], {
    ...spawnConfig,
    cwd: resolve(__dirname, "./packages/webui")
  });
  cb();
}

function devServer(cb) {
  spawn("npm", ["run", "serve"], {
    ...spawnConfig,
    cwd: resolve(__dirname, "./packages/webui")
  });
  cb();
}

function clean(...args) {
  return parallel([cleanUI, cleanApp])(...args);
}

function cleanUI(cb) {
  rrimraf(resolve(__dirname, "./packages/webui/dist"), cb);
}

function cleanApp(cb) {
  rrimraf(resolve(__dirname, "./packages/cli/", appDistDir), cb);
}

module.exports = {
  buildApp,
  runApp,
  dev: parallel([appDev, devServer]),
  appDev,
  devServer,
  buildUI,
  clean,
  cleanUI,
  cleanApp
};

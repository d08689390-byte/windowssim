const http = require("http");
const net = require("net");
const os = require("os");
const path = require("path");
const fs = require("fs");
const { spawn, spawnSync } = require("child_process");

const port = Number(process.env.WINDOWSSIM_HELPER_PORT || 4173);
const maxExecutableSize = 1024 * 1024 * 1024;
const executionMode = process.env.WINDOWSSIM_EXECUTION_MODE || "wine";
const wineBinary = process.env.WINE_BIN || "wine";
const winebootBinary = process.env.WINEBOOT_BIN || "wineboot";
const wineBottlePrefix =
  process.env.WINDOWSSIM_WINE_BOTTLE_PREFIX ||
  process.env.WINEPREFIX ||
  path.join(
    os.homedir(),
    ".local",
    "share",
    "windowssim",
    "bottles",
    "default"
  );
const winePrefix = path.resolve(wineBottlePrefix);
const wineWindowsVersion =
  process.env.WINDOWSSIM_WINE_WINDOWS_VERSION || "win10";
const winetricksBinary = process.env.WINETRICKS_BIN || "winetricks";
const winetricksPackages = (process.env.WINDOWSSIM_WINETRICKS || "")
  .split(",")
  .map((packageName) => packageName.trim())
  .filter(Boolean);
const setupBottle = process.env.WINDOWSSIM_SETUP_BOTTLE === "true";
const installWinetricks = process.env.WINDOWSSIM_INSTALL_WINETRICKS === "true";
const bottleSetupTimeout = Number(
  process.env.WINDOWSSIM_BOTTLE_SETUP_TIMEOUT || 120000
);
const playOnLinuxBinary = process.env.PLAYONLINUX_BIN || "playonlinux";
const playOnLinuxApp = process.env.PLAYONLINUX_APP || "";
const allowedOrigin = process.env.WINDOWSSIM_ALLOWED_ORIGIN || "";
const host = process.env.WINDOWSSIM_HELPER_HOST || "0.0.0.0";
const uploads = new Map();
const vncPort = Number(process.env.WINDOWSSIM_VNC_PORT || 5901);
const viewerPort = Number(process.env.WINDOWSSIM_VIEWER_PORT || 6080);
const display = process.env.DISPLAY || process.env.WINDOWSSIM_DISPLAY || ":99";
const guiProcesses = [];
let guiViewerStarted = false;
const novncWebRoot = path.join(os.tmpdir(), "windowssim-novnc");
const launchEnvironment = {
  ...process.env,
  DISPLAY: display,
  WINEPREFIX: winePrefix,
};
const wmctrlBinary = process.env.WMCTRL_BIN || "wmctrl";
const windowManagerBinary = process.env.WINDOWSSIM_WM || "openbox";
const prefixRoot = winePrefix;
const wineDriveRoot = path.join(prefixRoot, "drive_c");

if (!["wine", "playonlinux"].includes(executionMode)) {
  throw new Error('WINDOWSSIM_EXECUTION_MODE must be "wine" or "playonlinux"');
}

const setupWineBottle = () => {
  if (!setupBottle || executionMode !== "wine") return;
  if (!process.env.DISPLAY) {
    console.warn(
      "Skipping synchronous bottle setup because the helper will create Xvfb first."
    );
    return;
  }

  fs.mkdirSync(prefixRoot, { recursive: true });
  const markerPath = path.join(prefixRoot, ".windowssim-bottle");
  if (fs.existsSync(markerPath)) return;

  const setupEnvironment = {
    ...process.env,
    WINEPREFIX: prefixRoot,
    WINEARCH: process.env.WINEARCH || "win64",
    WINEDEBUG: process.env.WINEDEBUG || "-all",
  };
  const wineboot = spawnSync(winebootBinary, ["-u"], {
    env: setupEnvironment,
    stdio: "inherit",
    timeout: bottleSetupTimeout,
  });
  if (wineboot.error || wineboot.status !== 0 || wineboot.signal) {
    throw new Error(
      `Unable to initialize the Wine bottle at ${prefixRoot}: ${
        wineboot.error?.message || `wineboot exited with ${wineboot.status}`
      }`
    );
  }

  if (installWinetricks && winetricksPackages.length) {
    const winetricks = spawnSync(
      winetricksBinary,
      ["-q", "settings", wineWindowsVersion, ...winetricksPackages],
      {
        env: setupEnvironment,
        stdio: "inherit",
        timeout: bottleSetupTimeout,
      }
    );
    if (winetricks.error || winetricks.status !== 0 || winetricks.signal) {
      throw new Error(
        `Unable to configure the Wine bottle: ${
          winetricks.error?.message ||
          `winetricks exited with ${winetricks.status}`
        }`
      );
    }
  }
  fs.writeFileSync(
    markerPath,
    JSON.stringify(
      {
        windowsVersion: wineWindowsVersion,
        packages: winetricksPackages,
      },
      null,
      2
    )
  );
};

setupWineBottle();

const configureWineInternet = () => {
  if (executionMode !== "wine") return;
  const proxyValue =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy;
  if (!proxyValue) return;

  let proxy;
  try {
    proxy = new URL(proxyValue);
  } catch {
    console.error(`Ignoring invalid proxy URL: ${proxyValue}`);
    return;
  }
  const proxyServer = `${proxy.hostname}:${proxy.port || 80}`;
  const registryPath =
    "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings";
  const registryEnvironment = {
    ...launchEnvironment,
    WINEDEBUG: process.env.WINEDEBUG || "-all",
  };
  const settings = [
    ["ProxyEnable", "REG_DWORD", "1"],
    ["ProxyServer", "REG_SZ", proxyServer],
  ];
  settings.forEach(([name, type, value]) => {
    const result = spawnSync(
      wineBinary,
      ["reg", "add", registryPath, "/v", name, "/t", type, "/d", value, "/f"],
      { env: registryEnvironment, stdio: "ignore", timeout: 15000 }
    );
    if (result.error || result.status !== 0) {
      console.error(`Unable to configure Wine internet setting ${name}.`);
    }
  });
  console.log(`Wine internet proxy configured for ${proxy.hostname}.`);
};

const isAllowedOrigin = (origin) =>
  !origin ||
  origin === "null" ||
  origin === allowedOrigin ||
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin) ||
  /^https:\/\/[a-z0-9-]+-\d+\.app\.github\.dev$/i.test(origin);

const sendJson = (response, statusCode, body) => {
  const headers = {
    "Access-Control-Allow-Origin": response.req.headers.origin || "*",
    "Access-Control-Allow-Headers":
      "Content-Type, X-Executable-Name, X-Installed-Exe-Path, X-Upload-Id, X-Chunk-Index, X-Chunk-Total",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
  response.writeHead(statusCode, headers);
  response.end(JSON.stringify(body));
};

const getLaunchCommand = (executablePath) => {
  if (executionMode === "playonlinux") {
    if (!playOnLinuxApp) {
      throw new Error(
        "PLAYONLINUX_APP must name a registered PlayOnLinux application"
      );
    }
    return {
      command: playOnLinuxBinary,
      args: ["--run", playOnLinuxApp, executablePath],
      env: launchEnvironment,
    };
  }

  return {
    command: wineBinary,
    args: [executablePath],
    env: winePrefix
      ? { ...launchEnvironment, WINEPREFIX: winePrefix }
      : launchEnvironment,
  };
};

const isSafeInstalledPath = (executablePath) =>
  path.extname(executablePath).toLowerCase() === ".exe" &&
  executablePath.startsWith(`${wineDriveRoot}${path.sep}`);

const findInstalledExecutables = (root, relativePath = "", results = []) => {
  if (results.length >= 100) return results;
  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return results;
  }
  entries.forEach((entry) => {
    if (results.length >= 100 || entry.name.startsWith(".")) return;
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      findInstalledExecutables(
        absolutePath,
        path.join(relativePath, entry.name),
        results
      );
    } else if (
      entry.isFile() &&
      entry.name.toLowerCase().endsWith(".exe") &&
      !entry.name.toLowerCase().startsWith("unins")
    ) {
      results.push({
        name: entry.name,
        path: path.relative(wineDriveRoot, absolutePath),
        folder: relativePath || "Program Files",
      });
    }
  });
  return results;
};

const findPrefixFiles = (root, relativePath = "", results = []) => {
  if (results.length >= 500) return results;
  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return results;
  }
  entries.forEach((entry) => {
    if (results.length >= 500 || entry.name.startsWith(".")) return;
    const absolutePath = path.join(root, entry.name);
    const relative = path.join(relativePath, entry.name);
    if (entry.isDirectory()) {
      findPrefixFiles(absolutePath, relative, results);
      return;
    }
    if (entry.isFile()) {
      results.push({
        name: entry.name,
        path: relative.split(path.sep).join("/"),
        size: fs.statSync(absolutePath).size,
      });
    }
  });
  return results;
};

const maximizeWineWindow = (windowTitle, attempts = 12, windowClass = "") => {
  const listing = spawn(wmctrlBinary, ["-l"], {
    env: launchEnvironment,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  listing.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  listing.once("error", (error) => {
    console.error(`Unable to inspect Wine windows: ${error.message}`);
  });
  listing.once("close", () => {
    const windowLines = output
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.toLowerCase().includes("desktop"));
    const requestedTitle = windowTitle.toLowerCase();
    const requestedClass = windowClass.toLowerCase();
    const matchingLines = windowLines.filter((line) => {
      const lowerLine = line.toLowerCase();
      return (
        lowerLine.includes(requestedTitle) ||
        (requestedClass && lowerLine.includes(requestedClass))
      );
    });
    const windowIds = matchingLines.map((line) => line.split(/\s+/)[0]);
    if (windowIds.length) {
      const resizeWindow = (windowId, remainingIds) => {
        const restore = spawn(
          wmctrlBinary,
          ["-i", "-r", windowId, "-b", "remove,maximized_vert,maximized_horz"],
          { env: launchEnvironment, stdio: "ignore" }
        );
        restore.once("error", (error) => {
          console.error(`Unable to restore Wine window: ${error.message}`);
        });
        restore.once("close", () => {
          const geometry = spawn(
            wmctrlBinary,
            ["-i", "-r", windowId, "-e", "0,0,0,1280,800"],
            { env: launchEnvironment, stdio: "ignore" }
          );
          geometry.once("error", (error) => {
            console.error(
              `Unable to set Wine window geometry: ${error.message}`
            );
          });
          geometry.once("close", () => {
            const maximizer = spawn(
              wmctrlBinary,
              ["-i", "-r", windowId, "-b", "add,maximized_vert,maximized_horz"],
              { env: launchEnvironment, stdio: "ignore" }
            );
            maximizer.once("error", (error) => {
              console.error(`Unable to maximize Wine window: ${error.message}`);
            });
            if (remainingIds.length) {
              maximizer.once("close", () =>
                resizeWindow(remainingIds[0], remainingIds.slice(1))
              );
            }
          });
        });
      };
      resizeWindow(windowIds[0], windowIds.slice(1));
      setTimeout(() => maximizeWineWindow(windowTitle, 1, windowClass), 500);
      return;
    }
    if (attempts > 1) {
      setTimeout(
        () => maximizeWineWindow(windowTitle, attempts - 1, windowClass),
        500
      );
    } else {
      console.error(`Wine window "${windowTitle}" was not found to maximize.`);
    }
  });
};

const prepareNoVncWebRoot = () => {
  const source = process.env.NOVNC_WEB_DIR || "/usr/share/novnc";
  fs.rmSync(novncWebRoot, { recursive: true, force: true });
  fs.cpSync(source, novncWebRoot, { recursive: true });
  const pagePath = path.join(novncWebRoot, "vnc.html");
  let page = fs.readFileSync(pagePath, "utf8");
  page = page
    .replace("<title>noVNC</title>", "<title>Application</title>")
    .replace(
      "</head>",
      `<style>
        html, body { background: #000 !important; }
        #noVNC_control_bar_anchor,
        #noVNC_control_bar,
        #noVNC_status,
        .noVNC_logo,
        .noVNC_version_wrapper,
        .noVNC_version_separator { display: none !important; }
      </style></head>`
    );
  fs.writeFileSync(pagePath, page);
  return novncWebRoot;
};

const waitForPort = (port, attempts = 20) =>
  new Promise((resolve) => {
    const check = (remaining) => {
      const socket = net.createConnection({ host: "127.0.0.1", port });
      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("error", () => {
        socket.destroy();
        if (remaining <= 1) resolve(false);
        else setTimeout(() => check(remaining - 1), 250);
      });
    };
    check(attempts);
  });

const startGuiViewer = async () => {
  if (guiViewerStarted) return;
  guiViewerStarted = true;
  if (await waitForPort(viewerPort, 1)) {
    console.log(
      `Wine GUI viewer already listening on port ${viewerPort} for display ${display}`
    );
    return;
  }
  const webRoot = prepareNoVncWebRoot();
  const vnc = spawn(
    process.env.X11VNC_BIN || "x11vnc",
    [
      "-display",
      display,
      "-rfbport",
      String(vncPort),
      "-forever",
      "-shared",
      "-nopw",
      "-localhost",
    ],
    { stdio: ["ignore", "ignore", "pipe"] }
  );
  const viewer = spawn(
    process.env.WEBSOCKIFY_BIN || "websockify",
    ["--web", webRoot, String(viewerPort), `127.0.0.1:${vncPort}`],
    { stdio: ["ignore", "ignore", "pipe"] }
  );
  guiProcesses.push(vnc, viewer);
  vnc.stderr.on("data", (data) =>
    console.error(`x11vnc: ${data.toString().trim()}`)
  );
  viewer.stderr.on("data", (data) =>
    console.error(`websockify: ${data.toString().trim()}`)
  );
  const viewerReady = await waitForPort(viewerPort);
  if (viewerReady) {
    console.log(
      `Wine GUI viewer ready on port ${viewerPort} for display ${display}`
    );
  } else {
    guiViewerStarted = false;
    console.error(
      `Wine GUI viewer failed to start on port ${viewerPort}. Check websockify and display ${display}.`
    );
  }
};

if (!process.env.DISPLAY) {
  const virtualDisplay = spawn(
    process.env.XVFB_BIN || "Xvfb",
    [display, "-screen", "0", "1280x800x24", "-ac"],
    { stdio: "ignore" }
  );
  guiProcesses.push(virtualDisplay);
  const windowManager = spawn(windowManagerBinary, ["--replace"], {
    env: launchEnvironment,
    stdio: "ignore",
  });
  guiProcesses.push(windowManager);
  setTimeout(() => {
    configureWineInternet();
    startGuiViewer();
  }, 500);
} else {
  configureWineInternet();
  startGuiViewer();
}

const server = http.createServer((request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    sendJson(response, 200, { ok: true, port });
    return;
  }

  if (request.method === "GET" && request.url === "/gui-health") {
    const socket = net.createConnection({
      host: "127.0.0.1",
      port: viewerPort,
    });
    socket.setTimeout(1000);
    const finish = (ok) => {
      socket.destroy();
      sendJson(response, ok ? 200 : 503, {
        ok,
        viewerPort,
        error: ok ? undefined : "The noVNC viewer is not listening",
      });
    };
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    return;
  }

  if (request.method === "GET" && request.url === "/installed-programs") {
    const roots = ["Program Files", "Program Files (x86)"]
      .map((folder) => path.join(wineDriveRoot, folder))
      .filter((folder) => fs.existsSync(folder));
    const programs = roots.flatMap((folder) =>
      findInstalledExecutables(folder, path.basename(folder))
    );
    sendJson(response, 200, { programs });
    return;
  }

  if (request.method === "GET" && request.url === "/prefix-files") {
    const roots = [
      path.join(wineDriveRoot, "users"),
      path.join(wineDriveRoot, "Program Files"),
      path.join(wineDriveRoot, "Program Files (x86)"),
    ].filter((folder) => fs.existsSync(folder));
    const files = roots.flatMap((folder) =>
      findPrefixFiles(folder, path.relative(wineDriveRoot, folder))
    );
    sendJson(response, 200, { files });
    return;
  }

  if (request.method === "GET" && request.url === "/wine-processes") {
    const processList = spawn(
      wineBinary,
      ["cmd", "/c", "tasklist", "/fo", "csv", "/nh"],
      {
      env: launchEnvironment,
      stdio: ["ignore", "pipe", "pipe"],
      }
    );
    let output = "";
    processList.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    processList.once("error", (error) => {
      sendJson(response, 500, { error: error.message });
    });
    processList.once("close", (code) => {
      if (code !== 0) {
        sendJson(response, 500, { error: "Wine tasklist failed" });
        return;
      }
      const processes = output
        .split(/\r?\n/)
        .map((line) => {
          const match = line.match(/^"([^"]+)","(\d+)","([^"]*)"/);
          return match
            ? { name: match[1], pid: Number(match[2]), session: match[3] }
            : null;
        })
        .filter(Boolean);
      sendJson(response, 200, { processes });
    });
    return;
  }

  if (request.method === "POST" && request.url === "/wine-kill-process") {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > 2000) request.destroy();
    });
    request.on("end", () => {
      let payload;
      try {
        payload = JSON.parse(body);
      } catch {
        sendJson(response, 400, { error: "Invalid kill request" });
        return;
      }
      const pid = Number(payload.pid);
      if (!Number.isInteger(pid) || pid <= 0) {
        sendJson(response, 400, { error: "A valid Wine process ID is required" });
        return;
      }
      const protectedNames = new Set([
        "wineserver",
        "winedevice.exe",
        "conhost.exe",
        "services.exe",
        "explorer.exe",
      ]);
      const processName = String(payload.name || "").toLowerCase();
      if (protectedNames.has(processName)) {
        sendJson(response, 403, { error: "Wine system processes cannot be killed" });
        return;
      }
      const killer = spawn(
        wineBinary,
        ["cmd", "/c", "taskkill", "/PID", String(pid), "/F"],
        { env: launchEnvironment, stdio: ["ignore", "pipe", "pipe"] }
      );
      let output = "";
      killer.stdout.on("data", (chunk) => {
        output += chunk.toString();
      });
      killer.stderr.on("data", (chunk) => {
        output += chunk.toString();
      });
      killer.once("error", (error) => {
        sendJson(response, 500, { error: error.message });
      });
      killer.once("close", (code) => {
        if (code !== 0) {
          sendJson(response, 400, { error: output || "Unable to kill Wine task" });
          return;
        }
        sendJson(response, 200, { killed: true, output });
      });
    });
    return;
  }

  if (request.method === "POST" && request.url === "/wine-terminal") {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > 10000) request.destroy();
    });
    request.on("end", () => {
      let payload;
      try {
        payload = JSON.parse(body);
      } catch {
        sendJson(response, 400, { error: "Invalid terminal request" });
        return;
      }
      if (typeof payload.command !== "string" || !payload.command.trim()) {
        sendJson(response, 400, { error: "A Wine command is required" });
        return;
      }
      const command = spawn(wineBinary, ["cmd", "/c", payload.command], {
        env: launchEnvironment,
        cwd: wineDriveRoot,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let output = "";
      command.stdout.on("data", (chunk) => {
        output += chunk.toString();
      });
      command.stderr.on("data", (chunk) => {
        output += chunk.toString();
      });
      command.once("error", (error) => {
        sendJson(response, 500, { error: error.message });
      });
      command.once("close", (code) => {
        sendJson(response, 200, { output, code });
      });
    });
    return;
  }

  if (request.method === "OPTIONS") {
    const headers = {
      "Access-Control-Allow-Origin": request.headers.origin || "*",
      "Access-Control-Allow-Headers":
        "Content-Type, X-Executable-Name, X-Installed-Exe-Path, X-Upload-Id, X-Chunk-Index, X-Chunk-Total",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    };
    response.writeHead(204, headers);
    response.end();
    return;
  }

  if (request.method === "POST" && request.url === "/run-installed-exe") {
    const executablePath = path.resolve(
      wineDriveRoot,
      decodeURIComponent(request.headers["x-installed-exe-path"] || "")
    );
    if (
      !isSafeInstalledPath(executablePath) ||
      !fs.existsSync(executablePath)
    ) {
      sendJson(response, 400, { error: "Installed executable was not found" });
      return;
    }
    let launch;
    try {
      launch = getLaunchCommand(executablePath);
    } catch (error) {
      sendJson(response, 400, { error: error.message });
      return;
    }
    const launchedProcess = spawn(launch.command, launch.args, {
      detached: true,
      stdio: "ignore",
      env: launch.env,
    });
    launchedProcess.once("error", (error) => {
      console.error(`Unable to launch ${executablePath}:`, error);
    });
    launchedProcess.once("spawn", () => {
      setTimeout(
        () =>
          maximizeWineWindow(
            path.basename(executablePath),
            12,
            path.basename(executablePath, path.extname(executablePath))
          ),
        1000
      );
    });
    launchedProcess.unref();
    sendJson(response, 202, { started: true });
    return;
  }

  if (request.method !== "POST" || request.url !== "/run-exe") {
    if (request.method === "POST" && request.url === "/run-exe-chunk") {
      handleExecutableChunk(request, response);
      return;
    }
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  const fileName = decodeURIComponent(
    request.headers["x-executable-name"] || ""
  );
  if (!/^[^/\\:*?"<>|]+\.exe$/i.test(fileName)) {
    sendJson(response, 400, { error: "Only .exe files are allowed" });
    return;
  }

  const tempPath = path.join(
    os.tmpdir(),
    `windowssim-${Date.now()}-${fileName}`
  );
  let bytes = 0;
  const output = fs.createWriteStream(tempPath, { flags: "wx" });

  request.on("data", (chunk) => {
    bytes += chunk.length;
    if (bytes > maxExecutableSize) {
      request.destroy(new Error("Executable exceeds the 1 GB limit"));
      output.destroy();
      fs.rm(tempPath, { force: true }, () => {});
      return;
    }
    output.write(chunk);
  });

  function handleExecutableChunk(request, response) {
    const fileName = decodeURIComponent(
      request.headers["x-executable-name"] || ""
    );
    const uploadId = request.headers["x-upload-id"];
    const chunkIndex = Number(request.headers["x-chunk-index"]);
    const chunkTotal = Number(request.headers["x-chunk-total"]);

    if (
      !uploadId ||
      !/^[^/\\:*?"<>|]+\.exe$/i.test(fileName) ||
      !Number.isInteger(chunkIndex) ||
      !Number.isInteger(chunkTotal) ||
      chunkIndex < 0 ||
      chunkIndex >= chunkTotal
    ) {
      sendJson(response, 400, { error: "Invalid executable chunk request" });
      return;
    }

    let upload = uploads.get(uploadId);
    if (!upload) {
      upload = {
        fileName,
        tempPath: path.join(os.tmpdir(), `windowssim-${uploadId}-${fileName}`),
        nextChunk: 0,
        bytes: 0,
      };
      uploads.set(uploadId, upload);
    }

    if (upload.nextChunk !== chunkIndex) {
      sendJson(response, 409, {
        error: "Executable chunks must be sent in order",
      });
      return;
    }

    const output = fs.createWriteStream(upload.tempPath, {
      flags: chunkIndex === 0 ? "w" : "a",
    });
    output.on("error", (error) => {
      uploads.delete(uploadId);
      fs.rm(upload.tempPath, { force: true }, () => {});
      if (!response.headersSent) {
        sendJson(response, 500, {
          error: error.code || "Unable to save executable",
        });
      }
    });
    request.on("data", (chunk) => {
      upload.bytes += chunk.length;
      if (upload.bytes > maxExecutableSize) {
        request.destroy(new Error("Executable exceeds the 1 GB limit"));
        output.destroy();
        uploads.delete(uploadId);
        fs.rm(upload.tempPath, { force: true }, () => {});
        return;
      }
      output.write(chunk);
    });
    request.on("error", () => {
      output.destroy();
      uploads.delete(uploadId);
      fs.rm(upload.tempPath, { force: true }, () => {});
    });
    request.on("end", () => {
      output.end(() => {
        upload.nextChunk += 1;
        if (chunkIndex + 1 < chunkTotal) {
          sendJson(response, 202, { complete: false });
          return;
        }

        uploads.delete(uploadId);
        let launch;
        try {
          launch = getLaunchCommand(upload.tempPath);
        } catch (error) {
          fs.rm(upload.tempPath, { force: true }, () => {});
          sendJson(response, 400, { error: error.message });
          return;
        }

        const launchedProcess = spawn(launch.command, launch.args, {
          detached: true,
          stdio: "ignore",
          env: launch.env,
        });
        console.log(
          `Launching ${upload.fileName} with ${
            launch.command
          } ${launch.args.join(" ")}`
        );
        launchedProcess.once("error", (error) => {
          fs.rm(upload.tempPath, { force: true }, () => {});
          console.error(`Unable to launch ${upload.fileName}:`, error);
          if (!response.headersSent)
            sendJson(response, 500, { error: error.code || "Launch failed" });
        });
        launchedProcess.once("spawn", () => {
          setTimeout(() => maximizeWineWindow(upload.fileName), 1000);
          if (!response.headersSent) sendJson(response, 202, { started: true });
        });
        launchedProcess.once("exit", (code, signal) => {
          console.log(
            `${upload.fileName} exited with ${
              signal ? `signal ${signal}` : `code ${code}`
            }`
          );
        });
        launchedProcess.unref();
        setTimeout(
          () => fs.rm(upload.tempPath, { force: true }, () => {}),
          30000
        );
      });
    });
  }

  request.on("end", () => {
    output.end(() => {
      let launch;
      try {
        launch = getLaunchCommand(tempPath);
      } catch (error) {
        fs.rm(tempPath, { force: true }, () => {});
        sendJson(response, 400, { error: error.message });
        return;
      }

      const launchedProcess = spawn(launch.command, launch.args, {
        detached: true,
        stdio: "ignore",
        env: launch.env,
      });
      console.log(
        `Launching ${fileName} with ${launch.command} ${launch.args.join(" ")}`
      );
      launchedProcess.once("error", (error) => {
        fs.rm(tempPath, { force: true }, () => {});
        console.error(`Unable to launch ${fileName}:`, error);
        if (!response.headersSent) {
          sendJson(response, 500, {
            error: error.code || "Executable launch failed",
          });
        }
      });
      launchedProcess.once("spawn", () => {
        setTimeout(() => maximizeWineWindow(fileName), 1000);
        if (!response.headersSent) sendJson(response, 202, { started: true });
      });
      launchedProcess.once("exit", (code, signal) => {
        console.log(
          `${fileName} exited with ${
            signal ? `signal ${signal}` : `code ${code}`
          }`
        );
      });
      launchedProcess.unref();
      setTimeout(() => fs.rm(tempPath, { force: true }, () => {}), 30000);
    });
  });

  request.on("error", () => {
    output.destroy();
    fs.rm(tempPath, { force: true }, () => {});
  });
});

server.once("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Wine helper could not start because ${host}:${port} is already in use. ` +
        "Stop the existing Wine helper with Ctrl+C, or set WINDOWSSIM_HELPER_PORT."
    );
    process.exitCode = 1;
    return;
  }
  console.error(`Wine helper could not start: ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, host, () => {
  console.log(`Wine helper listening on ${host}:${port}`);
});

const stopGuiProcesses = () => {
  guiProcesses.forEach((child) => {
    if (!child.killed) child.kill();
  });
};
process.once("exit", stopGuiProcesses);
process.once("SIGINT", () => {
  stopGuiProcesses();
  process.exit(0);
});
process.once("SIGTERM", () => {
  stopGuiProcesses();
  process.exit(0);
});

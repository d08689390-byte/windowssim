<template>
  <div
    id="app"
    class="desktop-environment"
    @mousemove="handleDrag"
    @mouseup="stopDrag"
    @contextmenu.prevent="openContextMenu($event, null)"
  >
    <div class="system-bar">
      <button class="system-bar-button" @click="openUploadPicker">
        Upload
      </button>
      <button class="system-bar-button" @click="openDownloadPicker">
        Download
      </button>
      <span class="system-bar-status">
        {{ selectedFile ? selectedFile.name : "Select a file to download" }}
      </span>
      <input
        ref="uploadInput"
        class="visually-hidden"
        type="file"
        multiple
        accept="image/*,video/*,audio/*,.txt,.edpub,.epub,.pdf,.docx"
        @change="handleUpload"
      />
    </div>

    <!-- DESKTOP ICONS -->
    <div class="desktop-shortcuts">
      <div
        class="shortcut"
        :style="shortcutStyle('computer')"
        @mousedown.stop.prevent="startIconDrag($event, 'computer')"
        @dblclick="openComputerWindow"
      >
        <div
          class="shortcut-icon computer-icon"
          :class="{ 'custom-icon-active': iconUrls.computer }"
        >
          <img
            v-if="iconUrls.computer"
            :src="iconUrls.computer"
            alt=""
            class="custom-icon"
          />
        </div>
        <span class="shortcut-label">My Computer</span>
      </div>

      <div
        class="shortcut"
        :style="shortcutStyle('notepad')"
        @mousedown.stop.prevent="startIconDrag($event, 'notepad')"
        @dblclick="openWindow('notepad')"
      >
        <div
          class="shortcut-icon notepad-icon"
          :class="{ 'custom-icon-active': iconUrls.notepad }"
        >
          <img
            v-if="iconUrls.notepad"
            :src="iconUrls.notepad"
            alt=""
            class="custom-icon"
          />
        </div>
        <span class="shortcut-label">Notepad</span>
      </div>

      <div
        class="shortcut"
        :style="shortcutStyle('controlPanel')"
        @mousedown.stop.prevent="startIconDrag($event, 'controlPanel')"
        @dblclick="openWindow('controlPanel')"
      >
        <div
          class="shortcut-icon control-panel-icon"
          :class="{ 'custom-icon-active': iconUrls.controlPanel }"
        >
          <img
            v-if="iconUrls.controlPanel"
            :src="iconUrls.controlPanel"
            alt=""
            class="custom-icon"
          />
        </div>
        <span class="shortcut-label">Control Panel</span>
      </div>

      <div
        class="shortcut"
        :style="shortcutStyle('recycleBin')"
        @mousedown.stop.prevent="startIconDrag($event, 'recycleBin')"
        @dblclick="openRecycleBin"
      >
        <div
          class="shortcut-icon recycle-icon"
          :class="{ 'custom-icon-active': recycleBinIconUrl }"
        >
          <img
            v-if="recycleBinIconUrl"
            :src="recycleBinIconUrl"
            alt=""
            class="custom-icon"
          />
        </div>
        <span class="shortcut-label">Recycle Bin</span>
      </div>

      <div
        v-for="program in desktopPrograms"
        :key="program.path"
        class="shortcut"
        :style="installedProgramStyle(program)"
        @mousedown.stop.prevent="startProgramDrag($event, program)"
        @dblclick="launchInstalledProgram(program)"
      >
        <div
          class="shortcut-icon program-icon"
          :class="{ 'custom-icon-active': program.iconUrl }"
        >
          <img
            v-if="program.iconUrl"
            :src="program.iconUrl"
            alt=""
            class="custom-icon"
          />
          <span v-else>EXE</span>
        </div>
        <span class="shortcut-label">{{ program.displayName }}</span>
      </div>
    </div>

    <!-- NOTEPAD -->
    <div
      v-if="windows.notepad.isOpen && !windows.notepad.minimized"
      class="window notepad-window"
      :class="{ maximized: windows.notepad.maximized }"
      :style="{
        zIndex: windows.notepad.zIndex,
        top: windows.notepad.top + 34 + 'px',
        left: windows.notepad.left + 'px',
      }"
      @mousedown="setActive('notepad')"
    >
      <div class="title-bar" @mousedown.prevent="startDrag($event, 'notepad')">
        <div class="title-bar-text">
          <div
            class="win7-app-small-icon notepad-mini"
            :class="{ 'custom-icon-active': iconUrls.notepad }"
          >
            <img
              v-if="iconUrls.notepad"
              :src="iconUrls.notepad"
              alt=""
              class="custom-icon"
            />
          </div>
          Notepad - {{ notepadFileName }}
        </div>
        <div class="title-bar-controls" @mousedown.stop>
          <button
            aria-label="Minimize"
            @click="minimizeWindow('notepad')"
          ></button>
          <button
            aria-label="Maximize"
            @click="maximizeWindow('notepad')"
          ></button>
          <button aria-label="Close" @click="closeWindow('notepad')"></button>
        </div>
      </div>

      <div class="window-body">
        <div class="menu-bar">
          <span>File</span>
          <span class="menu-item" @click="saveNote">Save As</span>
          <span>Edit</span>
          <span>Format</span>
          <span>View</span>
          <span>Help</span>
        </div>
        <textarea class="notepad-editor" v-model="notepadContent"></textarea>
      </div>
    </div>

    <!-- COMPUTER -->
    <div
      v-if="windows.computer.isOpen && !windows.computer.minimized"
      class="window explorer-window"
      :class="{ maximized: windows.computer.maximized }"
      :style="{
        zIndex: windows.computer.zIndex,
        top: windows.computer.top + 34 + 'px',
        left: windows.computer.left + 'px',
      }"
      @mousedown="setActive('computer')"
    >
      <div class="title-bar" @mousedown.prevent="startDrag($event, 'computer')">
        <div class="title-bar-text">
          <div
            class="win7-app-small-icon"
            :class="[
              isMyComputerPage ? 'computer-mini' : 'file-manager-mini',
              { 'custom-icon-active': explorerIconUrl },
            ]"
          >
            <img
              v-if="explorerIconUrl"
              :src="explorerIconUrl"
              alt=""
              class="custom-icon"
            />
          </div>
          {{ explorerTitle }}
        </div>
        <div class="title-bar-controls" @mousedown.stop>
          <button
            aria-label="Minimize"
            @click="minimizeWindow('computer')"
          ></button>
          <button
            aria-label="Maximize"
            @click="maximizeWindow('computer')"
          ></button>
          <button aria-label="Close" @click="closeWindow('computer')"></button>
        </div>
      </div>

      <div class="explorer-toolbar">
        <input
          v-model="explorerPathInput"
          class="address-bar"
          :disabled="explorerView === 'recycleBin'"
          aria-label="File path"
          @keyup.enter="navigateToExplorerPath"
        />
        <input
          class="search-box"
          :placeholder="
            explorerView === 'recycleBin'
              ? 'Search Recycle Bin'
              : 'Search File Manager'
          "
        />
      </div>

      <div class="explorer-layout">
        <div class="explorer-sidebar">
          <div class="sidebar-group">Favorites</div>
          <button
            v-for="folder in userFolderShortcuts"
            :key="folder.name"
            class="sidebar-shortcut"
            :class="{
              'sidebar-group-active':
                explorerView === 'computer' &&
                currentPath.join('\\').toLowerCase() ===
                  folder.path.toLowerCase(),
            }"
            @click="openUserFolder(folder.name)"
          >
            <span class="sidebar-shortcut-icon">{{ folder.icon }}</span>
            {{ folder.name }}
          </button>
          <div class="sidebar-group">Libraries</div>
          <div
            class="sidebar-group"
            :class="{ 'sidebar-group-active': explorerView === 'computer' }"
            @click="openComputer"
          >
            {{ explorerTitle }}
          </div>
          <div
            class="sidebar-group"
            :class="{ 'sidebar-group-active': explorerView === 'recycleBin' }"
            @click="openRecycleBin"
          >
            Recycle Bin
          </div>
        </div>
        <div class="explorer-main" @click="closeContextMenu">
          <template v-if="explorerView === 'computer'">
            <template v-if="!isDriveOpen">
              <h3>Hard Disk Drives</h3>
              <div class="drive-item" @dblclick="openDrive">
                <div
                  class="drive-icon-large"
                  :class="{ 'custom-icon-active': iconUrls.drive }"
                >
                  <img
                    v-if="iconUrls.drive"
                    :src="iconUrls.drive"
                    alt=""
                    class="custom-icon"
                  />
                </div>
                <div>
                  <div class="drive-name">Local Disk (C:)</div>
                  <div class="drive-progress-bar">
                    <div class="fill-bar"></div>
                  </div>
                  <small>230GB free of 250GB</small>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="file-list-header">
                <div>
                  <h3>{{ currentFolder.name }}</h3>
                  <p>{{ currentFolderItems.length }} item(s)</p>
                </div>
                <button class="nav-btn" @click="goUp">Back</button>
              </div>
              <div class="file-list">
                <div
                  v-for="item in currentFolderItems"
                  :key="item.name"
                  class="file-item"
                  @dblclick="openFileSystemItem(item)"
                  @click.alt.prevent.stop="openContextMenu($event, item)"
                  @contextmenu.prevent.stop="openContextMenu($event, item)"
                >
                  <div
                    class="file-item-icon"
                    :class="{ 'folder-item-icon': item.type === 'folder' }"
                  >
                    {{ item.type === "folder" ? "📁" : "📄" }}
                  </div>
                  <div class="file-item-details">
                    <strong>{{ item.name }}</strong>
                    <small v-if="item.protected">Protected system item</small>
                    <small v-else>{{
                      item.type === "folder" ? "Folder" : "File"
                    }}</small>
                  </div>
                </div>
              </div>
            </template>
          </template>
          <template v-else>
            <div class="recycle-bin-header">
              <div>
                <h3>Recycle Bin</h3>
                <p v-if="recycleBinItems.length">
                  {{ recycleBinItems.length }} item(s)
                </p>
                <p v-else>This folder is empty.</p>
              </div>
              <button class="delete-all-button" @click="openDeleteConfirmation">
                Delete All
              </button>
            </div>
            <div v-if="recycleBinItems.length" class="recycle-bin-items">
              <div
                v-for="item in recycleBinItems"
                :key="item"
                class="recycle-bin-item"
              >
                {{ item }}
              </div>
            </div>
          </template>
        </div>
      </div>
      <div
        class="window-resize-handle"
        @mousedown.stop.prevent="startResize"
      ></div>
    </div>

    <div
      v-if="fileViewer.open && !fileViewer.minimized"
      class="window file-viewer-window"
      :class="{ minimized: fileViewer.minimized }"
      :style="{
        zIndex: fileViewer.zIndex,
        top: fileViewer.top + 'px',
        left: fileViewer.left + 'px',
      }"
      @mousedown="setFileViewerActive"
    >
      <div class="title-bar" @mousedown.prevent="startFileViewerDrag($event)">
        <div class="title-bar-text">
          {{ fileViewer.appName
          }}<span v-if="fileViewer.file.name">
            - {{ fileViewer.file.name }}</span
          >
        </div>
        <div class="title-bar-controls" @mousedown.stop>
          <button aria-label="Close" @click="closeFileViewer"></button>
        </div>
      </div>
      <div
        class="file-viewer-body"
        @contextmenu.stop.prevent="
          openContextMenu($event, fileViewer.file.name ? fileViewer.file : null)
        "
      >
        <template v-if="!fileViewer.file.name">
          <div class="viewer-launcher">
            <div
              class="viewer-app-mark"
              :class="`viewer-app-${fileViewer.kind}`"
            >
              {{
                fileViewer.kind === "pdf"
                  ? "PDF"
                  : fileViewer.kind === "document"
                  ? "W"
                  : "▶"
              }}
            </div>
            <h2>Open a {{ fileViewer.openPrompt }}</h2>
            <p>
              Select a file from File Manager to open it in
              {{ fileViewer.appName }}.
            </p>
            <button class="viewer-open-button" @click="openFileViewerPicker">
              Open
            </button>
          </div>
        </template>
        <template v-else-if="fileViewer.kind === 'image'">
          <img
            :src="fileViewer.file.content"
            :alt="fileViewer.file.name"
            class="viewer-image"
          />
        </template>
        <template v-else-if="fileViewer.kind === 'video'">
          <div class="viewer-media">
            <div class="media-screen">
              <div class="media-play-mark">{{ mediaPlaying ? "❚❚" : "▶" }}</div>
              <strong>{{ fileViewer.file.name }}</strong>
            </div>
            <div class="media-controls">
              <button @click="mediaPlaying = !mediaPlaying">
                {{ mediaPlaying ? "Pause" : "Play" }}
              </button>
              <span>Ficrosoft Media Player</span>
            </div>
          </div>
        </template>
        <template v-else-if="fileViewer.kind === 'audio'">
          <div class="viewer-media viewer-audio">
            <div class="viewer-placeholder-icon">♫</div>
            <strong>{{ fileViewer.file.name }}</strong>
            <div class="media-controls">
              <button @click="mediaPlaying = !mediaPlaying">
                {{ mediaPlaying ? "Pause" : "Play" }}
              </button>
              <span>Ficrosoft Media Player</span>
            </div>
          </div>
        </template>
        <template v-else-if="fileViewer.kind === 'document'">
          <div v-if="docxHtml" class="document-page-viewer">
            <article class="document-page" v-html="docxHtml"></article>
          </div>
          <div v-else class="viewer-document">
            <div class="viewer-placeholder-icon">W</div>
            <h2>Ficrosoft Word 2009</h2>
            <p>{{ fileViewer.file.name }}</p>
            <textarea
              v-model="wordDocumentContent"
              class="viewer-document-editor"
              aria-label="Word document text"
            ></textarea>
            <p class="viewer-note">
              This simulated viewer is ready for this document.
            </p>
          </div>
        </template>
        <template v-else>
          <div v-if="fileViewer.file.content" class="pdf-page-viewer">
            <iframe
              class="pdf-page-frame"
              :src="fileViewer.file.content"
              :title="`Fdobe Acrobat PDF Editor - ${fileViewer.file.name}`"
            ></iframe>
          </div>
          <div v-else class="viewer-document">
            <div class="viewer-placeholder-icon">PDF</div>
            <h2>Fdobe Acrobat PDF Editor</h2>
            <p>{{ fileViewer.file.name }}</p>
            <p class="viewer-note">
              This simulated viewer is ready for this PDF or EPUB.
            </p>
          </div>
        </template>
      </div>
      <div
        class="window-resize-handle"
        @mousedown.stop.prevent="startResize"
      ></div>
    </div>

    <div v-if="isDeleteConfirmationOpen" class="dialog-backdrop">
      <div class="delete-dialog" role="dialog" aria-modal="true">
        <h2>Delete all items?</h2>
        <p>Are you sure you want to delete {{ recycleBinConfirmationText }}?</p>
        <div class="dialog-actions">
          <button @click="confirmDeleteAll">Yes</button>
          <button @click="closeDeleteConfirmation">No</button>
        </div>
      </div>
    </div>

    <div v-if="isRecycleBinErrorOpen" class="dialog-backdrop">
      <div
        class="delete-dialog error-dialog"
        role="alertdialog"
        aria-modal="true"
      >
        <div class="error-dialog-content">
          <div class="error-icon">!</div>
          <div>
            <h2>Error</h2>
            <p>There is nothing in the recycle bin!</p>
          </div>
        </div>
        <div class="dialog-actions">
          <button @click="closeRecycleBinError">OK</button>
        </div>
      </div>
    </div>

    <div v-if="isStorageErrorOpen" class="dialog-backdrop">
      <div
        class="delete-dialog error-dialog"
        role="alertdialog"
        aria-modal="true"
      >
        <div class="error-dialog-content">
          <div class="error-icon">!</div>
          <div>
            <h2>Storage Error</h2>
            <p>{{ storageErrorMessage }}</p>
          </div>
        </div>
        <div class="dialog-actions">
          <button @click="closeStorageError">OK</button>
        </div>
      </div>
    </div>

    <div v-if="isNotificationOpen" class="dialog-backdrop">
      <div
        class="delete-dialog notification-dialog"
        role="dialog"
        aria-modal="true"
      >
        <div class="error-dialog-content">
          <div class="notification-icon">✓</div>
          <div>
            <h2>{{ notificationTitle }}</h2>
            <p>{{ notificationMessage }}</p>
          </div>
        </div>
        <div class="dialog-actions">
          <button @click="closeNotification">OK</button>
        </div>
      </div>
    </div>

    <div v-if="isWineGuiOpen && !wineGuiMinimized" class="wine-gui-window">
      <div class="window-titlebar">
        <span>{{ wineGuiTitle }}</span>
        <button class="window-close" @click="closeWineGui">×</button>
      </div>
      <iframe
        class="wine-gui-frame"
        :src="wineGuiUrl"
        title="Wine program window"
        allow="fullscreen"
      ></iframe>
      <div
        class="window-resize-handle"
        @mousedown.stop.prevent="startResize"
      ></div>
    </div>

    <div
      v-if="contextMenu.open"
      class="context-menu"
      :style="{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }"
      @click.stop
    >
      <button
        v-if="contextMenu.item && contextMenu.item.name"
        @click="openContextItem"
      >
        Open
      </button>
      <button
        v-if="
          contextMenu.item &&
          contextMenu.item.name &&
          contextMenu.item.type === 'file' &&
          !contextMenu.item.protected
        "
        @click="deleteContextItem"
      >
        Delete
      </button>
      <button v-if="canCreateProgramShortcut" @click="createProgramShortcut">
        Create desktop shortcut
      </button>
      <button v-if="canRemoveProgramShortcut" @click="removeProgramShortcut">
        Remove desktop shortcut
      </button>
      <button v-if="canCopyText" @click="copyContextText">Copy</button>
      <button v-if="canCutText" @click="cutContextText">Cut</button>
      <button v-if="canPasteText" @click="pasteContextText">Paste</button>
      <div
        v-if="contextMenu.item && contextMenu.item.protected"
        class="context-menu-disabled"
      >
        Protected item
      </div>
      <button @click="closeContextMenu">Cancel</button>
    </div>

    <div v-if="isFilePickerOpen" class="dialog-backdrop">
      <div class="file-picker-dialog" role="dialog" aria-modal="true">
        <div class="file-picker-title">
          <h2>
            {{
              filePickerMode === "save"
                ? "Save As"
                : filePickerMode === "download"
                ? "Download File"
                : filePickerMode === "open"
                ? `Open in ${fileViewer.appName}`
                : "Choose Profile Picture"
            }}
          </h2>
          <button class="file-picker-close" @click="closeFilePicker">×</button>
        </div>
        <p v-if="filePickerMode === 'save'">
          Choose a folder and name for your note.
        </p>
        <p v-else-if="filePickerMode === 'download'">
          Select a file to download.
        </p>
        <p v-else-if="filePickerMode === 'open'">
          Select a file to open in {{ fileViewer.appName }}.
        </p>
        <p v-else>Choose an image from your saved files.</p>
        <div class="file-picker-path">{{ filePickerPathLabel }}</div>
        <div class="file-picker-list">
          <button
            v-for="folder in filePickerFolders"
            :key="folder.name"
            class="file-picker-item"
            @click="selectFilePickerFolder(folder)"
          >
            📁 {{ folder.name }}
          </button>
          <button
            v-for="file in filePickerFiles"
            :key="file.name"
            class="file-picker-item"
            :class="{ 'file-picker-selected': selectedFile === file }"
            @click="selectFilePickerFile(file)"
          >
            📄 {{ file.name }}
          </button>
        </div>
        <input
          v-if="filePickerMode === 'save'"
          v-model="saveFileName"
          class="save-file-name"
          placeholder="File name (for example: notes.txt)"
        />
        <div class="dialog-actions">
          <button v-if="filePickerMode === 'save'" @click="saveNoteFile">
            Save
          </button>
          <button
            v-else-if="filePickerMode === 'download'"
            :disabled="!selectedFile"
            @click="downloadSelectedFile"
          >
            Download
          </button>
          <button
            v-else-if="filePickerMode === 'open'"
            :disabled="!selectedFile"
            @click="openSelectedViewerFile"
          >
            Open
          </button>
          <button v-else @click="chooseProfilePicture">Choose</button>
          <button @click="closeFilePicker">Cancel</button>
        </div>
      </div>
    </div>

    <div v-if="isOpenWithDialogOpen" class="dialog-backdrop">
      <div class="open-with-dialog" role="dialog" aria-modal="true">
        <div class="file-picker-title">
          <h2>Pick a application that supports this file</h2>
          <button class="file-picker-close" @click="closeOpenWithDialog">
            ×
          </button>
        </div>
        <p v-if="openWithFile">
          Choose an application for {{ openWithFile.name }}.
        </p>
        <div class="open-with-list">
          <button
            v-for="application in openWithApplications"
            :key="application.key"
            class="open-with-item"
            @click="openFileWithApplication(application.key)"
          >
            <span class="open-with-icon">{{ application.icon }}</span>
            <span>{{ application.label }}</span>
          </button>
        </div>
        <div class="dialog-actions">
          <button @click="closeOpenWithDialog">Cancel</button>
        </div>
      </div>
    </div>

    <div
      v-if="windows.terminal.isOpen && !windows.terminal.minimized"
      class="window wine-terminal-window"
      :style="{
        zIndex: windows.terminal.zIndex,
        top: windows.terminal.top + 34 + 'px',
        left: windows.terminal.left + 'px',
      }"
      @mousedown="setActive('terminal')"
    >
      <div class="title-bar" @mousedown.prevent="startDrag($event, 'terminal')">
        <div class="title-bar-text">Wine Terminal</div>
        <div class="title-bar-controls" @mousedown.stop>
          <button
            aria-label="Minimize"
            @click="minimizeWindow('terminal')"
          ></button>
          <button aria-label="Close" @click="closeWindow('terminal')"></button>
        </div>
      </div>
      <pre class="wine-terminal-output">{{
        terminalOutput || "Wine command terminal\n"
      }}</pre>
      <form class="wine-terminal-form" @submit.prevent="runWineTerminalCommand">
        <span>C:\&gt;</span>
        <input v-model="terminalCommand" :disabled="terminalBusy" autofocus />
      </form>
      <div
        class="window-resize-handle"
        @mousedown.stop.prevent="startResize"
      ></div>
    </div>

    <div
      v-if="windows.taskManager.isOpen && !windows.taskManager.minimized"
      class="window wine-task-manager-window"
      :style="{
        zIndex: windows.taskManager.zIndex,
        top: windows.taskManager.top + 34 + 'px',
        left: windows.taskManager.left + 'px',
      }"
      @mousedown="setActive('taskManager')"
    >
      <div
        class="title-bar"
        @mousedown.prevent="startDrag($event, 'taskManager')"
      >
        <div class="title-bar-text">Wine Task Manager</div>
        <div class="title-bar-controls" @mousedown.stop>
          <button
            aria-label="Minimize"
            @click="minimizeWindow('taskManager')"
          ></button>
          <button
            aria-label="Close"
            @click="closeWindow('taskManager')"
          ></button>
        </div>
      </div>
      <div class="wine-task-manager-toolbar">
        <button @click="loadWineProcesses">Refresh</button>
        <button
          :disabled="!selectedWineProcess"
          @click="killSelectedWineProcess"
        >
          End Task
        </button>
        <span>Processes running in the Wine prefix</span>
      </div>
      <div class="wine-process-list">
        <button
          v-for="process in wineProcesses"
          :key="process.pid"
          class="wine-process-row"
          :class="{ selected: selectedWineProcess?.pid === process.pid }"
          @click="selectedWineProcess = process"
        >
          <span>{{ process.name }}</span>
          <span>{{ process.pid }}</span>
        </button>
        <div v-if="!wineProcesses.length" class="wine-process-empty">
          Loading...
        </div>
      </div>
      <div
        class="window-resize-handle"
        @mousedown.stop.prevent="startResize"
      ></div>
    </div>

    <!-- CONTROL PANEL -->
    <div
      v-if="windows.controlPanel.isOpen && !windows.controlPanel.minimized"
      class="window control-panel-window"
      :class="{ maximized: windows.controlPanel.maximized }"
      :style="{
        zIndex: windows.controlPanel.zIndex,
        top: windows.controlPanel.top + 34 + 'px',
        left: windows.controlPanel.left + 'px',
      }"
      @mousedown="setActive('controlPanel')"
    >
      <div
        class="title-bar"
        @mousedown.prevent="startDrag($event, 'controlPanel')"
      >
        <div class="title-bar-text">Control Panel</div>
        <div class="title-bar-controls" @mousedown.stop>
          <button
            aria-label="Minimize"
            @click="minimizeWindow('controlPanel')"
          ></button>
          <button
            aria-label="Maximize"
            @click="maximizeWindow('controlPanel')"
          ></button>
          <button
            aria-label="Close"
            @click="closeWindow('controlPanel')"
          ></button>
        </div>
      </div>

      <div class="control-panel-layout">
        <div class="user-card">
          <img :src="userProfile.avatar" class="profile-avatar" />
          <h3>{{ userProfile.name }}</h3>
        </div>
        <div class="control-panel-content">
          <h2>User Accounts</h2>
          <input v-model="userProfile.name" placeholder="Username" />
          <input
            type="password"
            v-model="userProfile.password"
            placeholder="Password"
          />
          <button @click="openProfilePicturePicker">Choose Picture</button>
          <button @click="saveProfile">Save Changes</button>
        </div>
      </div>
    </div>

    <!-- START MENU -->
    <div v-if="isStartMenuOpen" class="start-menu">
      <div class="start-menu-left">
        <div class="start-item" @click="openWindow('notepad')">Notepad</div>
        <div class="start-item" @click="openComputerWindow">File Manager</div>
        <div class="start-item" @click="openWineTerminal">Terminal</div>
        <div class="start-item" @click="openWineTaskManager">Task Manager</div>
        <div
          v-if="
            !startMenuPrograms.some((program) => program.key === 'wmplayer')
          "
          class="start-item"
          @click="launchMediaPlayer"
        >
          Ficrosoft Media Player
        </div>
        <div
          v-for="program in startMenuPrograms"
          :key="program.key"
          class="start-item"
          @click="
            program.key === 'wmplayer'
              ? launchMediaPlayer()
              : launchInstalledProgram(program)
          "
        >
          {{ program.label }}
        </div>
        <div class="start-item" @click="launchWord">Ficrosoft Word 2009</div>
        <div class="start-item" @click="launchPdfViewer">
          Fdobe Acrobat PDF Editor
        </div>
        <div class="start-item" @click="openWindow('controlPanel')">
          Control Panel
        </div>
      </div>
      <div class="start-menu-right">
        <img :src="userProfile.avatar" class="start-avatar" />
        <div>{{ userProfile.name }}</div>
        <button class="shutdown-button" @click="shutdownSimulator">
          Shut Down
        </button>
      </div>
    </div>

    <!-- TASKBAR -->
    <div class="taskbar">
      <div
        class="start-orb"
        :class="{ 'custom-icon-active': iconUrls.startMenu }"
        @click="toggleStartMenu"
      >
        <img
          v-if="iconUrls.startMenu"
          :src="iconUrls.startMenu"
          alt="Start"
          class="start-icon"
        />
      </div>
      <div class="taskbar-apps">
        <div
          v-if="windows.terminal.isOpen"
          class="taskbar-button"
          :class="{
            active: activeWindow === 'terminal' && !windows.terminal.minimized,
          }"
          @click="restoreWindow('terminal')"
        >
          Terminal
        </div>
        <div
          v-if="windows.taskManager.isOpen"
          class="taskbar-button"
          :class="{
            active:
              activeWindow === 'taskManager' && !windows.taskManager.minimized,
          }"
          @click="restoreWindow('taskManager')"
        >
          Task Manager
        </div>
        <div
          v-if="windows.notepad.isOpen"
          class="taskbar-button"
          :class="{
            active: activeWindow === 'notepad' && !windows.notepad.minimized,
          }"
          @click="restoreWindow('notepad')"
        >
          Notepad
        </div>
        <div
          v-if="windows.computer.isOpen"
          class="taskbar-button"
          :class="{
            active: activeWindow === 'computer' && !windows.computer.minimized,
          }"
          @click="restoreWindow('computer')"
        >
          File Manager
        </div>
        <div
          v-if="windows.controlPanel.isOpen"
          class="taskbar-button"
          :class="{
            active:
              activeWindow === 'controlPanel' &&
              !windows.controlPanel.minimized,
          }"
          @click="restoreWindow('controlPanel')"
        >
          Control Panel
        </div>
        <div
          v-if="fileViewer.open"
          class="taskbar-button"
          :class="{
            active: activeWindow === 'fileViewer' && !fileViewer.minimized,
          }"
          @click="toggleFileViewer"
        >
          {{ fileViewer.appName || "Application" }}
        </div>
        <div
          v-if="isWineGuiOpen"
          class="taskbar-button"
          :class="{ active: !wineGuiMinimized }"
          @click="toggleWineGui"
        >
          {{ wineGuiTitle }}
        </div>
      </div>
      <div class="tray">
        <div class="clock">
          <div>{{ currentTime }}</div>
          <div>{{ currentDate }}</div>
        </div>
        <div class="show-desktop" @click="minimizeAll"></div>
      </div>
    </div>
  </div>
</template>

<script>
import mammoth from "mammoth";

const createWindow = (top = 100, left = 100) => ({
  isOpen: false,
  minimized: false,
  maximized: false,
  zIndex: 1,
  top,
  left,
});

const defaultAvatar =
  "https://d08689390-byte.github.io/Extra-Stuff/my-windows7-simulator/default-profile.jpeg";

export default {
  name: "App",

  data() {
    return {
      windows: {
        notepad: createWindow(80, 200),
        computer: createWindow(120, 100),
        controlPanel: createWindow(160, 250),
        terminal: createWindow(100, 160),
        taskManager: createWindow(130, 220),
      },
      fileViewer: {
        open: false,
        appName: "",
        kind: "pdf",
        openPrompt: ".pdf file",
        file: { name: "", content: "" },
        minimized: false,
        zIndex: 1,
        top: 150,
        left: 300,
      },
      mediaPlaying: false,
      wordDocumentContent: "",
      docxHtml: "",
      terminalCommand: "",
      terminalOutput: "",
      terminalBusy: false,
      wineProcesses: [],
      selectedWineProcess: null,
      taskManagerTimer: null,
      explorerView: "computer",
      isDriveOpen: false,
      currentPath: [],
      explorerPathInput: "C:\\",
      contextMenu: {
        open: false,
        x: 0,
        y: 0,
        item: null,
        textTarget: null,
        selectionStart: 0,
        selectionEnd: 0,
      },
      fileSystem: {
        name: "C:",
        type: "folder",
        protected: true,
        children: [
          {
            name: "Windows",
            type: "folder",
            protected: true,
            children: [
              { name: "explorer.exe", type: "file", protected: true },
              {
                name: "System32",
                type: "folder",
                protected: true,
                children: [],
              },
            ],
          },
          {
            name: "Program Files (x86)",
            type: "folder",
            protected: true,
            children: [
              {
                name: "Common Files",
                type: "folder",
                protected: true,
                children: [],
              },
              { name: "readme.txt", type: "file", protected: false },
            ],
          },
          {
            name: "Users",
            type: "folder",
            protected: true,
            children: [
              {
                name: "Alex",
                type: "folder",
                protected: true,
                children: [
                  {
                    name: "Downloads",
                    type: "folder",
                    protected: true,
                    children: [],
                  },
                  {
                    name: "Documents",
                    type: "folder",
                    protected: true,
                    children: [],
                  },
                  {
                    name: "Music",
                    type: "folder",
                    protected: true,
                    children: [],
                  },
                  {
                    name: "Videos",
                    type: "folder",
                    protected: true,
                    children: [],
                  },
                  {
                    name: "Pictures",
                    type: "folder",
                    protected: true,
                    children: [],
                  },
                  {
                    name: "Desktop",
                    type: "folder",
                    protected: true,
                    children: [],
                  },
                  { name: "welcome.txt", type: "file", protected: false },
                ],
              },
            ],
          },
          {
            name: "ProgramData",
            type: "folder",
            protected: true,
            children: [
              { name: "app-settings.dat", type: "file", protected: false },
            ],
          },
          {
            name: "%AppData%",
            type: "folder",
            protected: true,
            children: [
              { name: "preferences.json", type: "file", protected: false },
            ],
          },
          {
            name: "Temp",
            type: "folder",
            protected: false,
            children: [
              { name: "temporary-file.tmp", type: "file", protected: false },
            ],
          },
          { name: "bootmgr", type: "file", protected: true },
        ],
      },
      recycleBinItems: [],
      selectedFile: null,
      isFilePickerOpen: false,
      isOpenWithDialogOpen: false,
      openWithFile: null,
      filePickerMode: "save",
      filePickerPath: [],
      saveFileName: "",
      isDeleteConfirmationOpen: false,
      isRecycleBinErrorOpen: false,
      isStorageErrorOpen: false,
      storageErrorMessage: "",
      isNotificationOpen: false,
      notificationTitle: "",
      notificationMessage: "",
      isWineGuiOpen: false,
      wineGuiUrl: "",
      wineGuiTitle: "",
      wineGuiMinimized: false,
      installedPrograms: [],
      installedProgramShortcuts: {},
      wineFilesTimer: null,
      activeWindow: null,
      nextZIndex: 10,
      isStartMenuOpen: false,
      notepadContent: "",
      notepadFileName: "Untitled",
      desktopIconPositions: {
        computer: { top: 18, left: 115 },
        notepad: { top: 120, left: 18 },
        controlPanel: { top: 120, left: 115 },
        recycleBin: { top: 18, left: 18 },
      },
      installedProgramPositions: {},
      // Paste image URLs here to replace the built-in CSS icons.
      iconUrls: {
        computer:
          "https://d08689390-byte.github.io/Extra-Stuff/my-windows7-simulator/my-computer.png",
        fileManager:
          "https://d08689390-byte.github.io/Extra-Stuff/my-windows7-simulator/file-manager.png",
        notepad:
          "https://d08689390-byte.github.io/Extra-Stuff/my-windows7-simulator/notepad.png",
        controlPanel:
          "https://d08689390-byte.github.io/Extra-Stuff/my-windows7-simulator/control-panel.jpeg",
        recycleBinEmpty:
          "https://d08689390-byte.github.io/Extra-Stuff/my-windows7-simulator/trash-empty.png",
        recycleBinFull:
          "https://d08689390-byte.github.io/Extra-Stuff/my-windows7-simulator/trash-full.png",
        drive:
          "https://d08689390-byte.github.io/Extra-Stuff/my-windows7-simulator/hard-disk.png",
        startMenu:
          "https://d08689390-byte.github.io/Extra-Stuff/my-windows7-simulator/windows7-orb.png",
        internetExplorer:
          "https://d08689390-byte.github.io/Extra-Stuff/my-windows7-simulator/internet-explorer.png",
      },
      recycleBinIsEmpty: true,
      userProfile: {
        name: "Alex",
        password: "",
        avatar: defaultAvatar,
      },
      currentTime: "",
      currentDate: "",
      clockTimer: null,

      dragState: {
        isDragging: false,
        targetWindow: null,
        targetIcon: null,
        targetProgram: null,
        startX: 0,
        startY: 0,
        startTop: 0,
        startLeft: 0,
      },
      resizeState: {
        isResizing: false,
        element: null,
        startX: 0,
        startY: 0,
        startWidth: 0,
        startHeight: 0,
        minWidth: 280,
        minHeight: 180,
      },
    };
  },

  mounted() {
    this.updateClock();
    this.clockTimer = window.setInterval(this.updateClock, 1000);
    this.loadProfile();
    this.loadFileSystem();
    this.syncUserFolder();
    this.loadNote();
    this.loadDesktopIconPositions();
    this.loadInstalledProgramShortcuts();
    this.loadInstalledPrograms();
    this.syncWineFiles();
    this.wineFilesTimer = window.setInterval(this.syncWineFiles, 5000);
    this.taskManagerTimer = window.setInterval(() => {
      if (this.windows.taskManager.isOpen) this.loadWineProcesses();
    }, 3000);
  },

  beforeDestroy() {
    window.clearInterval(this.clockTimer);
    window.clearInterval(this.wineFilesTimer);
    window.clearInterval(this.taskManagerTimer);
    this.stopResize();
  },

  computed: {
    userFolderShortcuts() {
      const basePath = `Users\\${this.userProfile.name}`;
      return [
        { name: "Documents", icon: "📄", path: `${basePath}\\Documents` },
        { name: "Pictures", icon: "🖼", path: `${basePath}\\Pictures` },
        { name: "Music", icon: "♫", path: `${basePath}\\Music` },
        { name: "Videos", icon: "▶", path: `${basePath}\\Videos` },
        { name: "Downloads", icon: "↓", path: `${basePath}\\Downloads` },
        { name: "Desktop", icon: "▣", path: `${basePath}\\Desktop` },
      ];
    },

    openWithApplications() {
      return [
        { key: "notepad", label: "Notepad", icon: "📝" },
        { key: "word", label: "Ficrosoft Word 2009", icon: "W" },
        { key: "media", label: "Ficrosoft Media Player", icon: "▶" },
        { key: "pdf", label: "Fdobe Acrobat PDF Editor", icon: "PDF" },
        { key: "photoshop", label: "Fdobe Photoshop", icon: "PS" },
      ];
    },

    desktopPrograms() {
      const seen = new Set();
      return this.installedPrograms
        .filter((program) => {
          const key = program.name.toLowerCase();
          if (!this.installedProgramShortcuts[program.path]) return false;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((program) => {
          if (
            !["iexplorer.exe", "iexplore.exe"].includes(
              program.name.toLowerCase()
            )
          ) {
            return { ...program, displayName: program.name, iconUrl: "" };
          }
          return {
            ...program,
            displayName: "Internet Explorer 9",
            iconUrl: this.iconUrls.internetExplorer,
          };
        });
    },

    startMenuPrograms() {
      const seen = new Set();
      const labels = {
        "wmplayer.exe": { key: "wmplayer", label: "Ficrosoft Media Player" },
        "wordpad.exe": { key: "wordpad", label: "Wordpad" },
      };
      return this.installedPrograms
        .filter((program) => labels[program.name.toLowerCase()])
        .filter((program) => {
          const key = program.name.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((program) => ({
          ...program,
          ...labels[program.name.toLowerCase()],
        }));
    },

    canCopyText() {
      return (
        this.contextMenu.selectionEnd > this.contextMenu.selectionStart ||
        Boolean(window.getSelection?.().toString())
      );
    },
    canCreateProgramShortcut() {
      const item = this.contextMenu.item;
      return Boolean(
        item &&
          item.type === "file" &&
          item.winePath &&
          item.name.toLowerCase().endsWith(".exe") &&
          !this.installedProgramShortcuts[item.winePath]
      );
    },
    canRemoveProgramShortcut() {
      const item = this.contextMenu.item;
      return Boolean(
        item?.winePath && this.installedProgramShortcuts[item.winePath]
      );
    },
    canCutText() {
      return Boolean(this.contextMenu.textTarget && this.canCopyText);
    },
    canPasteText() {
      return Boolean(this.contextMenu.textTarget);
    },
    isMyComputerPage() {
      return this.explorerView === "computer" && !this.isDriveOpen;
    },
    explorerTitle() {
      return this.isMyComputerPage ? "My Computer" : "File Manager";
    },
    explorerIconUrl() {
      return this.isMyComputerPage
        ? this.iconUrls.computer
        : this.iconUrls.fileManager;
    },
    recycleBinIconUrl() {
      return this.recycleBinIsEmpty
        ? this.iconUrls.recycleBinEmpty
        : this.iconUrls.recycleBinFull;
    },
    recycleBinConfirmationText() {
      if (!this.recycleBinItems.length) return "the selected files";

      return this.recycleBinItems
        .map((item, index) => (index === 0 ? item : `+${index}`))
        .join(", ");
    },
    currentFolder() {
      return this.currentPath.reduce(
        (folder, folderName) =>
          folder.children.find((item) => item.name === folderName) || folder,
        this.fileSystem
      );
    },
    currentFolderItems() {
      return this.currentFolder.children || [];
    },
    filePickerFolder() {
      return this.filePickerPath.reduce(
        (folder, folderName) =>
          folder.children.find((item) => item.name === folderName) || folder,
        this.fileSystem
      );
    },
    filePickerFolders() {
      return (this.filePickerFolder.children || []).filter(
        (item) => item.type === "folder"
      );
    },
    filePickerFiles() {
      return (this.filePickerFolder.children || []).filter(
        (item) =>
          item.type === "file" &&
          (this.filePickerMode !== "picture" ||
            item.mime?.startsWith("image/")) &&
          (this.filePickerMode !== "open" || this.fileMatchesViewerFilter(item))
      );
    },
    filePickerPathLabel() {
      return `C:\\${this.filePickerPath.join("\\")}`;
    },
  },

  methods: {
    shortcutStyle(iconName) {
      const position = this.desktopIconPositions[iconName] || {
        top: 18,
        left: 18,
      };
      return {
        top: `${position.top + 34}px`,
        left: `${position.left}px`,
      };
    },

    installedProgramStyle(program) {
      const index = this.desktopPrograms.indexOf(program);
      const position = this.installedProgramPositions[program.path] || {
        top: 18 + Math.floor(index / 4) * 102,
        left: 230 + (index % 4) * 105,
      };
      return {
        top: `${position.top + 34}px`,
        left: `${position.left}px`,
      };
    },

    async loadInstalledPrograms() {
      try {
        const response = await fetch("/wine-helper/installed-programs", {
          cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Discovery failed");
        this.installedPrograms = result.programs || [];
        this.addInstalledProgramsToFileSystem(this.installedPrograms);
      } catch {
        this.installedPrograms = [];
      }
    },

    async syncWineFiles() {
      try {
        const response = await fetch("/wine-helper/prefix-files", {
          cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "File sync failed");

        const userRoot = this.getUserFolder();
        if (!userRoot) return;
        const syncedFolders = new Set([
          "Desktop",
          "Downloads",
          "Documents",
          "Music",
          "Videos",
          "Pictures",
        ]);
        const clearWineSyncedItems = (folder) => {
          folder.children = (folder.children || []).filter(
            (item) => !item.wineSynced
          );
          folder.children.forEach((item) => {
            if (item.type === "folder") clearWineSyncedItems(item);
          });
        };
        this.fileSystem.children
          .filter((item) =>
            ["Program Files", "Program Files (x86)"].includes(item.name)
          )
          .forEach(clearWineSyncedItems);
        syncedFolders.forEach((folderName) => {
          const folder = userRoot.children.find(
            (item) => item.name === folderName
          );
          if (!folder) return;
          folder.children = folder.children.filter((item) => !item.wineSynced);
        });

        (result.files || []).forEach((wineFile) => {
          const parts = wineFile.path.split("/");
          if (parts[0].toLowerCase() !== "users" || parts.length < 5) return;
          const folderName = parts[3];
          if (!syncedFolders.has(folderName) || parts.length !== 5) return;
          const folder = userRoot.children.find(
            (item) => item.name === folderName
          );
          if (!folder) return;
          folder.children.push({
            name: parts[4],
            type: "file",
            protected: false,
            winePath: wineFile.path,
            wineSynced: true,
            size: wineFile.size,
          });
        });

        (result.files || []).forEach((wineFile) => {
          const parts = wineFile.path.split("/");
          const rootName = parts[0];
          if (
            !["Program Files", "Program Files (x86)"].includes(rootName) ||
            parts.length < 2
          ) {
            return;
          }
          const rootFolder = this.fileSystem.children.find(
            (item) => item.name === rootName
          );
          if (!rootFolder) return;
          let folder = rootFolder;
          parts.slice(1, -1).forEach((folderName) => {
            let child = folder.children.find(
              (item) => item.type === "folder" && item.name === folderName
            );
            if (!child) {
              child = {
                name: folderName,
                type: "folder",
                protected: true,
                wineSynced: true,
                children: [],
              };
              folder.children.push(child);
            }
            folder = child;
          });
          const fileName = parts[parts.length - 1];
          if (
            !folder.children.some((item) => item.winePath === wineFile.path)
          ) {
            folder.children.push({
              name: fileName,
              type: "file",
              protected: true,
              winePath: wineFile.path,
              wineSynced: true,
              size: wineFile.size,
            });
          }
        });
        this.saveFileSystem();
      } catch (error) {
        console.error("Unable to synchronize Wine files:", error);
      }
    },

    addInstalledProgramsToFileSystem(programs) {
      const programFolders = ["Program Files", "Program Files (x86)"];
      programs.forEach((program) => {
        const folderName = program.folder.startsWith("Program Files (x86)")
          ? "Program Files (x86)"
          : "Program Files";
        const folder = this.fileSystem.children.find(
          (item) => item.name === folderName
        );
        if (!folder) return;
        const existing = (folder.children || []).find(
          (item) => item.winePath === program.path
        );
        if (!existing) {
          folder.children.push({
            name: program.name,
            type: "file",
            protected: true,
            winePath: program.path,
          });
        }
      });
      if (
        programFolders.some((name) =>
          this.fileSystem.children.some((item) => item.name === name)
        )
      ) {
        this.saveFileSystem();
      }
    },

    updateClock() {
      const now = new Date();
      this.currentTime = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      this.currentDate = now.toLocaleDateString([], {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      });
    },

    setActive(windowName) {
      const target =
        this.windows[windowName] ||
        (windowName === "fileViewer" ? this.fileViewer : null);
      if (!target) return;

      this.nextZIndex += 1;
      target.zIndex = this.nextZIndex;
      this.activeWindow = windowName;
    },

    startFileViewerDrag(event) {
      this.setFileViewerActive();
      this.dragState.isDragging = true;
      this.dragState.targetWindow = "fileViewer";
      this.dragState.targetIcon = null;
      this.dragState.startX = event.clientX;
      this.dragState.startY = event.clientY;
      this.dragState.startTop = this.fileViewer.top;
      this.dragState.startLeft = this.fileViewer.left;
    },

    openWindow(windowName) {
      const target = this.windows[windowName];
      if (!target) return;

      target.isOpen = true;
      target.minimized = false;
      this.isStartMenuOpen = false;
      this.setActive(windowName);
    },

    openComputerWindow() {
      this.openComputer();
      this.openWindow("computer");
    },

    openWineTerminal() {
      this.openWindow("terminal");
    },

    openWineTaskManager() {
      this.openWindow("taskManager");
      this.loadWineProcesses();
    },

    async runWineTerminalCommand() {
      const command = this.terminalCommand.trim();
      if (!command || this.terminalBusy) return;
      this.terminalBusy = true;
      try {
        const response = await fetch("/wine-helper/wine-terminal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command }),
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Wine command failed");
        this.terminalOutput += `C:\\> ${command}\n${result.output || ""}`;
        this.terminalCommand = "";
      } catch (error) {
        this.terminalOutput += `\nError: ${
          error instanceof Error ? error.message : "Wine command failed"
        }\n`;
      } finally {
        this.terminalBusy = false;
      }
    },

    async loadWineProcesses() {
      try {
        const response = await fetch("/wine-helper/wine-processes", {
          cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Task list failed");
        this.wineProcesses = result.processes || [];
        if (
          this.selectedWineProcess &&
          !this.wineProcesses.some(
            (process) => process.pid === this.selectedWineProcess.pid
          )
        ) {
          this.selectedWineProcess = null;
        }
      } catch (error) {
        this.wineProcesses = [
          `Unable to load Wine processes: ${
            error instanceof Error ? error.message : "request failed"
          }`,
        ];
      }
    },

    async killSelectedWineProcess() {
      if (!this.selectedWineProcess) return;
      try {
        const response = await fetch("/wine-helper/wine-kill-process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(this.selectedWineProcess),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to end task");
        this.selectedWineProcess = null;
        await this.loadWineProcesses();
      } catch (error) {
        this.showStorageError(
          error instanceof Error ? error.message : "Unable to end Wine task."
        );
      }
    },

    launchMediaPlayer() {
      const installedMediaPlayer = this.installedPrograms.find(
        (program) => program.name.toLowerCase() === "wmplayer.exe"
      );
      if (installedMediaPlayer) {
        this.launchInstalledProgram(installedMediaPlayer);
        return;
      }
      this.openStandaloneViewer(
        "Ficrosoft Media Player",
        "media",
        "media file"
      );
    },

    launchWord() {
      this.openStandaloneViewer(
        "Ficrosoft Word 2009",
        "document",
        ".docx file"
      );
    },

    launchPdfViewer() {
      this.openStandaloneViewer(
        "Fdobe Acrobat PDF Editor",
        "pdf",
        ".pdf or .epub file"
      );
    },

    openStandaloneViewer(appName, kind, openPrompt) {
      this.fileViewer = {
        ...this.fileViewer,
        open: true,
        appName,
        kind,
        openPrompt,
        file: { name: "", content: "" },
        minimized: false,
      };
      this.mediaPlaying = false;
      this.isStartMenuOpen = false;
      this.setFileViewerActive();
    },

    openRecycleBin() {
      this.explorerView = "recycleBin";
      this.explorerPathInput = "Recycle Bin";
      this.openWindow("computer");
    },

    openComputer() {
      this.explorerView = "computer";
      this.isDriveOpen = false;
      this.currentPath = [];
      this.syncExplorerPathInput();
    },

    openDrive() {
      this.explorerView = "computer";
      this.isDriveOpen = true;
      this.currentPath = [];
      this.syncExplorerPathInput();
    },

    openUserFolder(folderName) {
      this.explorerView = "computer";
      this.isDriveOpen = true;
      this.currentPath = ["Users", this.userProfile.name, folderName];
      this.syncExplorerPathInput();
      this.setActive("computer");
    },

    openFileSystemItem(item) {
      this.closeContextMenu();
      if (item.type === "file") {
        this.openFile(item);
        return;
      }
      if (item.type !== "folder") return;
      this.currentPath = [...this.currentPath, item.name];
      this.isDriveOpen = true;
      this.explorerView = "computer";
      this.syncExplorerPathInput();
    },

    syncExplorerPathInput() {
      this.explorerPathInput = this.currentPath.length
        ? `C:\\${this.currentPath.join("\\")}`
        : "C:\\";
    },

    navigateToExplorerPath() {
      if (this.explorerView === "recycleBin") return;

      const requestedPath = this.explorerPathInput.trim().replace(/\//g, "\\");
      const pathWithoutDrive = requestedPath
        .replace(/^file manager\\?/i, "")
        .replace(/^c:\\?/i, "")
        .replace(/^\\+/, "")
        .replace(/\\+$/, "");
      const nextPath = pathWithoutDrive
        ? pathWithoutDrive.split("\\").filter(Boolean)
        : [];
      let folder = this.fileSystem;
      const resolvedPath = [];

      for (const folderName of nextPath) {
        const nextFolder = (folder.children || []).find(
          (item) =>
            item.type === "folder" &&
            item.name.toLowerCase() === folderName.toLowerCase()
        );
        if (!nextFolder) {
          this.showStorageError(
            `The path "${this.explorerPathInput}" could not be found.`
          );
          this.syncExplorerPathInput();
          return;
        }
        folder = nextFolder;
        resolvedPath.push(nextFolder.name);
      }

      this.explorerView = "computer";
      this.isDriveOpen = resolvedPath.length > 0;
      this.currentPath = resolvedPath;
      this.syncExplorerPathInput();
    },

    openFile(file) {
      const nameParts = file.name.split(".");
      const extension =
        nameParts.length > 1 ? nameParts.pop().toLowerCase() : "";
      const mime = file.mime || "";

      if (extension === "exe") {
        this.runExecutable(file);
        return;
      }

      if (extension === "txt" || mime === "text/plain") {
        this.notepadFileName = file.name;
        if (file.content && file.content.startsWith("data:text/plain")) {
          this.notepadContent = decodeURIComponent(
            file.content.split(",")[1] || ""
          );
        }
        this.openWindow("notepad");
        return;
      }

      let kind = "pdf";
      let appName = "Fdobe Acrobat PDF Editor";
      if (extension === "docx" || mime.includes("wordprocessingml")) {
        kind = "document";
        appName = "Ficrosoft Word 2009";
      } else if (
        mime.startsWith("image/") ||
        ["png", "jpg", "jpeg", "gif", "webp"].includes(extension)
      ) {
        kind = "image";
        appName = "Fdobe Photoshop";
      } else if (
        mime.startsWith("video/") ||
        ["mp4", "webm", "mov", "avi"].includes(extension)
      ) {
        kind = "video";
        appName = "Ficrosoft Media Player";
      } else if (
        mime.startsWith("audio/") ||
        ["wav", "mp3", "ogg"].includes(extension)
      ) {
        kind = "audio";
        appName = "Ficrosoft Media Player";
      } else if (!["pdf", "epub", "edpub"].includes(extension)) {
        this.openWithFile = file;
        this.isOpenWithDialogOpen = true;
        return;
      }

      this.fileViewer = {
        ...this.fileViewer,
        open: true,
        appName,
        kind,
        openPrompt: "",
        file,
      };
      if (kind === "document") {
        this.wordDocumentContent = `Opened ${file.name}`;
        this.loadDocxContent(file);
      }
      this.mediaPlaying = false;
      this.fileViewer.minimized = false;
      this.setFileViewerActive();
    },

    closeOpenWithDialog() {
      this.isOpenWithDialogOpen = false;
      this.openWithFile = null;
    },

    openFileWithApplication(applicationKey) {
      const file = this.openWithFile;
      if (!file) return;

      this.closeOpenWithDialog();
      if (applicationKey === "notepad") {
        this.notepadFileName = file.name;
        if (file.content && file.content.startsWith("data:text/plain")) {
          this.notepadContent = decodeURIComponent(
            file.content.split(",")[1] || ""
          );
        } else {
          this.notepadContent = `Opened ${file.name}`;
        }
        this.openWindow("notepad");
        return;
      }

      const applications = {
        word: ["Ficrosoft Word 2009", "document"],
        media: ["Ficrosoft Media Player", "video"],
        pdf: ["Fdobe Acrobat PDF Editor", "pdf"],
        photoshop: ["Fdobe Photoshop", "image"],
      };
      const [appName, kind] = applications[applicationKey] || [];
      if (!appName) return;

      this.fileViewer = {
        ...this.fileViewer,
        open: true,
        appName,
        kind,
        openPrompt: "",
        file,
        minimized: false,
      };
      this.wordDocumentContent =
        kind === "document" ? `Opened ${file.name}` : this.wordDocumentContent;
      if (kind === "document") this.loadDocxContent(file);
      this.mediaPlaying = false;
      this.setFileViewerActive();
    },

    async loadDocxContent(file) {
      this.docxHtml = "";
      if (!file.content) return;

      try {
        const response = await fetch(file.content);
        if (!response.ok) throw new Error("Unable to read the document");
        const arrayBuffer = await response.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        this.docxHtml = result.value;
      } catch (error) {
        console.error(
          `Unable to render ${file.name} as a Word document.`,
          error
        );
      }
    },

    async runExecutable(file) {
      if (file.winePath) {
        try {
          const response = await fetch("/wine-helper/run-installed-exe", {
            method: "POST",
            headers: {
              "X-Installed-Exe-Path": encodeURIComponent(file.winePath),
            },
          });
          const result = await response.json();
          if (!response.ok)
            throw new Error(result.error || "Wine launch failed");
          await this.openWineGui(file.name);
          this.showNotification(
            "Program Started",
            `${file.name} was started from the Wine prefix.`
          );
        } catch (error) {
          this.showStorageError(
            `Unable to launch ${file.name}. ${
              error instanceof Error ? error.message : "Wine launch failed"
            }`
          );
        }
        return;
      }

      if (!file.content) {
        this.showStorageError(
          `${file.name} does not contain a real executable file to launch.`
        );
        return;
      }

      try {
        let executable;
        try {
          const fileResponse = await fetch(file.content);
          if (!fileResponse.ok) throw new Error("Unable to read executable");
          executable = await fileResponse.blob();
        } catch {
          throw new Error(
            "The saved executable data could not be read. Upload the EXE again."
          );
        }
        const chunkSize = 512 * 1024;
        const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const chunkTotal = Math.ceil(executable.size / chunkSize);
        let result;

        for (let chunkIndex = 0; chunkIndex < chunkTotal; chunkIndex += 1) {
          const controller = new AbortController();
          const timeout = window.setTimeout(() => controller.abort(), 60000);
          let response;
          try {
            response = await fetch("/wine-helper/run-exe-chunk", {
              method: "POST",
              cache: "no-store",
              signal: controller.signal,
              headers: {
                "Content-Type": "application/octet-stream",
                "X-Executable-Name": encodeURIComponent(file.name),
                "X-Upload-Id": uploadId,
                "X-Chunk-Index": String(chunkIndex),
                "X-Chunk-Total": String(chunkTotal),
              },
              body: executable.slice(
                chunkIndex * chunkSize,
                (chunkIndex + 1) * chunkSize
              ),
            });
          } catch (error) {
            if (error.name === "AbortError") {
              throw new Error(
                "The Wine helper did not respond within 60 seconds."
              );
            }
            throw error;
          } finally {
            window.clearTimeout(timeout);
          }
          const responseText = await response.text();
          try {
            result = JSON.parse(responseText);
          } catch {
            throw new Error(
              `The helper proxy returned HTTP ${response.status} with a non-JSON response.`
            );
          }
          if (!response.ok)
            throw new Error(result.error || "Wine launch failed");
        }
        if (!result?.started) {
          throw new Error(
            "The executable was uploaded but Wine did not start it."
          );
        }
        await this.openWineGui(file.name);
        this.showNotification(
          "Program Started",
          `${file.name} was started with Wine. Its GUI is now available in the Wine window.`
        );
      } catch (error) {
        const detail =
          error instanceof Error && error.message
            ? error.message
            : "The Wine helper did not accept the executable.";
        this.showStorageError(
          `Unable to launch ${file.name}. ${detail} Make sure the Wine helper is running on port 4173.`
        );
      }
    },

    launchInstalledProgram(program) {
      this.runExecutable({
        name: program.name,
        winePath: program.path,
      });
    },

    fileMatchesViewerFilter(file) {
      const extension = file.name.split(".").pop().toLowerCase();
      if (this.fileViewer.kind === "document") return extension === "docx";
      if (this.fileViewer.kind === "pdf")
        return ["pdf", "epub", "edpub"].includes(extension);
      if (this.fileViewer.kind === "media") {
        return (
          file.mime?.startsWith("audio/") ||
          file.mime?.startsWith("video/") ||
          ["mp3", "wav", "ogg", "mp4", "webm", "mov", "avi"].includes(extension)
        );
      }
      return false;
    },

    openFileViewerPicker() {
      this.filePickerMode = "open";
      this.filePickerPath = ["Users", this.userProfile.name];
      this.selectedFile = null;
      this.isFilePickerOpen = true;
    },

    setFileViewerActive() {
      this.nextZIndex += 1;
      this.fileViewer.zIndex = this.nextZIndex;
      this.activeWindow = "fileViewer";
    },

    closeFileViewer() {
      this.fileViewer.open = false;
      this.fileViewer.minimized = false;
      if (this.activeWindow === "fileViewer") this.activeWindow = null;
    },

    openContextMenu(event, item) {
      const target = event.target.closest?.(
        "textarea, input, [contenteditable='true']"
      );
      const textTarget =
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLInputElement ||
        target?.isContentEditable
          ? target
          : null;
      this.contextMenu = {
        open: true,
        x: event.clientX,
        y: event.clientY,
        item,
        textTarget,
        selectionStart: textTarget?.selectionStart ?? 0,
        selectionEnd: textTarget?.selectionEnd ?? 0,
      };
    },

    async copyContextText() {
      try {
        const text = this.getContextText();
        if (text) await navigator.clipboard.writeText(text);
        this.closeContextMenu();
      } catch {
        this.showStorageError("Unable to copy the selected text.");
      }
    },

    async cutContextText() {
      const target = this.contextMenu.textTarget;
      const text = this.getContextText();
      if (!target || !text) return;
      try {
        await navigator.clipboard.writeText(text);
        this.replaceContextText(target, "");
        this.closeContextMenu();
      } catch {
        this.showStorageError("Unable to cut the selected text.");
      }
    },

    async pasteContextText() {
      const target = this.contextMenu.textTarget;
      if (!target) return;
      try {
        const text = await navigator.clipboard.readText();
        this.replaceContextText(target, text);
        this.closeContextMenu();
      } catch {
        this.showStorageError("Unable to paste text from the clipboard.");
      }
    },

    getContextText() {
      const target = this.contextMenu.textTarget;
      if (target && "value" in target) {
        return target.value.slice(
          this.contextMenu.selectionStart,
          this.contextMenu.selectionEnd
        );
      }
      return window.getSelection?.().toString() || "";
    },

    replaceContextText(target, replacement) {
      if (!("value" in target)) return;
      const start = this.contextMenu.selectionStart;
      const end = this.contextMenu.selectionEnd;
      target.value =
        target.value.slice(0, start) + replacement + target.value.slice(end);
      target.dispatchEvent(new Event("input", { bubbles: true }));
      const caret = start + replacement.length;
      target.setSelectionRange(caret, caret);
      target.focus();
    },

    openContextItem() {
      const item = this.contextMenu.item;
      this.closeContextMenu();
      if (item) this.openFileSystemItem(item);
    },

    createProgramShortcut() {
      const item = this.contextMenu.item;
      if (!item?.winePath) return;
      this.$set(this.installedProgramShortcuts, item.winePath, true);
      this.saveInstalledProgramShortcuts();
      this.closeContextMenu();
    },

    removeProgramShortcut() {
      const item = this.contextMenu.item;
      if (!item?.winePath) return;
      this.$delete(this.installedProgramShortcuts, item.winePath);
      this.saveInstalledProgramShortcuts();
      this.closeContextMenu();
    },

    deleteContextItem() {
      const item = this.contextMenu.item;
      this.closeContextMenu();
      if (item) this.deleteFileSystemItem(item);
    },

    closeContextMenu() {
      this.contextMenu.open = false;
      this.contextMenu.item = null;
      this.contextMenu.textTarget = null;
    },

    goUp() {
      if (this.currentPath.length) {
        this.currentPath = this.currentPath.slice(0, -1);
        this.isDriveOpen = true;
        this.syncExplorerPathInput();
      } else {
        this.openComputer();
      }
    },

    deleteFileSystemItem(item) {
      if (item.type !== "file" || item.protected) return;

      const itemIndex = this.currentFolderItems.indexOf(item);
      if (itemIndex === -1) return;

      this.recycleBinItems.push(`${this.currentPath.join("\\")}\\${item.name}`);
      this.currentFolderItems.splice(itemIndex, 1);
      this.recycleBinIsEmpty = false;
      this.saveFileSystem();
    },

    openDeleteConfirmation() {
      this.isDeleteConfirmationOpen = true;
    },

    closeDeleteConfirmation() {
      this.isDeleteConfirmationOpen = false;
    },

    closeRecycleBinError() {
      this.isRecycleBinErrorOpen = false;
    },

    confirmDeleteAll() {
      if (!this.recycleBinItems.length) {
        this.closeDeleteConfirmation();
        this.isRecycleBinErrorOpen = true;
        return;
      }

      this.recycleBinItems = [];
      this.recycleBinIsEmpty = true;
      this.closeDeleteConfirmation();
    },

    closeWindow(windowName) {
      const target = this.windows[windowName];
      if (!target) return;

      target.isOpen = false;
      target.minimized = false;
      target.maximized = false;
      if (this.activeWindow === windowName) {
        this.activeWindow = null;
      }
    },

    shutdownSimulator() {
      Object.keys(this.windows).forEach((windowName) => {
        const target = this.windows[windowName];
        target.isOpen = false;
        target.minimized = false;
        target.maximized = false;
      });
      this.fileViewer.open = false;
      this.fileViewer.minimized = false;
      this.isWineGuiOpen = false;
      this.wineGuiUrl = "";
      this.wineGuiTitle = "";
      this.activeWindow = null;
      this.isStartMenuOpen = false;
    },

    minimizeWindow(windowName) {
      const target = this.windows[windowName];
      if (target) {
        target.minimized = true;
        if (this.activeWindow === windowName) {
          this.activeWindow = null;
        }
      }
    },

    maximizeWindow(windowName) {
      const target = this.windows[windowName];
      if (target) {
        target.maximized = !target.maximized;
        this.setActive(windowName);
      }
    },

    restoreWindow(windowName) {
      const target = this.windows[windowName];
      if (!target) return;

      if (!target.isOpen) {
        this.openWindow(windowName);
        return;
      }

      if (target.minimized) {
        target.minimized = false;
        this.setActive(windowName);
      } else if (this.activeWindow === windowName) {
        target.minimized = true;
        this.activeWindow = null;
      } else {
        this.setActive(windowName);
      }
      this.isStartMenuOpen = false;
    },

    toggleFileViewer() {
      if (this.fileViewer.minimized) {
        this.fileViewer.minimized = false;
        this.setFileViewerActive();
      } else if (this.activeWindow === "fileViewer") {
        this.fileViewer.minimized = true;
        this.activeWindow = null;
      } else {
        this.setFileViewerActive();
      }
      this.isStartMenuOpen = false;
    },

    toggleWineGui() {
      if (this.wineGuiMinimized) {
        this.wineGuiMinimized = false;
      } else if (this.activeWindow === "wineGui") {
        this.wineGuiMinimized = true;
        this.activeWindow = null;
      }
      if (!this.wineGuiMinimized) this.activeWindow = "wineGui";
      this.isStartMenuOpen = false;
    },

    minimizeAll() {
      Object.keys(this.windows).forEach((windowName) => {
        this.windows[windowName].minimized = true;
      });
      this.fileViewer.minimized = true;
      this.wineGuiMinimized = true;
      this.activeWindow = null;
      this.isStartMenuOpen = false;
    },

    toggleStartMenu() {
      this.isStartMenuOpen = !this.isStartMenuOpen;
    },

    openUploadPicker() {
      this.$refs.uploadInput.click();
    },

    async handleUpload(event) {
      const files = Array.from(event.target.files || []);

      files.forEach((file) => {
        if (file.size > 1024 * 1024 * 1024) {
          this.showStorageError(
            `${file.name} is too large. Please upload files smaller than 1 GB.`
          );
          return;
        }
        const storageKey = this.createFileStorageKey();
        this.storeUploadedFile(file, storageKey)
          .then((content) => {
            const targetFolder = this.getUploadFolder(file);
            if (!targetFolder) return this.deleteStoredFile(storageKey);

            const existingIndex = targetFolder.children.findIndex(
              (item) => item.name === file.name
            );
            const previousFile =
              existingIndex === -1
                ? null
                : targetFolder.children[existingIndex];
            const uploadedFile = {
              name: file.name,
              type: "file",
              protected: false,
              mime: file.type || "application/octet-stream",
              content,
              storageKey,
            };
            if (existingIndex === -1) targetFolder.children.push(uploadedFile);
            else this.$set(targetFolder.children, existingIndex, uploadedFile);
            if (!this.saveFileSystem()) {
              if (existingIndex === -1) targetFolder.children.pop();
              else
                this.$set(targetFolder.children, existingIndex, previousFile);
              return this.deleteStoredFile(storageKey);
            }
            this.showNotification(
              "Upload Complete",
              `File ${file.name} Has been uploaded to C:/Users/${this.userProfile.name}/${targetFolder.name}`
            );
            return null;
          })
          .catch((error) => {
            this.showStorageError(
              error instanceof DOMException &&
                error.name === "QuotaExceededError"
                ? "There is not enough browser storage to save this file."
                : `Unable to save ${file.name}.`
            );
          });
      });
      event.target.value = "";
    },

    downloadSelectedFile() {
      if (!this.selectedFile || !this.selectedFile.content) return;

      const link = document.createElement("a");
      link.href = this.selectedFile.content;
      link.download = this.selectedFile.name;
      link.click();
      this.showNotification(
        "Download Complete",
        `File ${this.selectedFile.name} Has been downloaded`
      );
      this.closeFilePicker();
    },

    openProfilePicturePicker() {
      this.filePickerMode = "picture";
      this.filePickerPath = ["Users", this.userProfile.name, "Downloads"];
      this.selectedFile = null;
      this.isFilePickerOpen = true;
    },

    openSaveAsPicker() {
      this.filePickerMode = "save";
      this.filePickerPath = ["Users", this.userProfile.name, "Documents"];
      this.saveFileName = "";
      this.selectedFile = null;
      this.isFilePickerOpen = true;
    },

    openDownloadPicker() {
      this.filePickerMode = "download";
      this.filePickerPath = ["Users", this.userProfile.name];
      this.selectedFile = null;
      this.isFilePickerOpen = true;
    },

    closeFilePicker() {
      this.isFilePickerOpen = false;
      this.selectedFile = null;
    },

    showStorageError(message) {
      this.storageErrorMessage = message;
      this.isStorageErrorOpen = true;
    },

    closeStorageError() {
      this.isStorageErrorOpen = false;
      this.storageErrorMessage = "";
    },

    showNotification(title, message) {
      this.notificationTitle = title;
      this.notificationMessage = message;
      this.isNotificationOpen = true;
    },

    closeNotification() {
      this.isNotificationOpen = false;
      this.notificationTitle = "";
      this.notificationMessage = "";
    },

    getWineGuiUrl() {
      const { protocol, hostname } = window.location;
      const viewerHost = hostname.replace(
        /-\d+\.app\.github\.dev$/i,
        "-6080.app.github.dev"
      );
      const base = hostname.endsWith(".app.github.dev")
        ? `${protocol}//${viewerHost}`
        : `${protocol}//${hostname}:6080`;
      return `${base}/vnc.html?autoconnect=true&resize=scale&reconnect=true&path=websockify`;
    },

    async openWineGui(title, url = this.getWineGuiUrl()) {
      const guiResponse = await fetch("/wine-helper/gui-health", {
        cache: "no-store",
      });
      if (!guiResponse.ok) {
        throw new Error(
          "The noVNC viewer is not listening on port 6080. Restart the Wine helper."
        );
      }
      this.wineGuiTitle = title;
      this.wineGuiUrl = url;
      this.wineGuiMinimized = false;
      this.isWineGuiOpen = true;
      this.activeWindow = "wineGui";
    },

    closeWineGui() {
      this.isWineGuiOpen = false;
      this.wineGuiUrl = "";
      this.wineGuiTitle = "";
      this.wineGuiMinimized = false;
      if (this.activeWindow === "wineGui") this.activeWindow = null;
    },

    selectFilePickerFolder(folder) {
      this.filePickerPath = [...this.filePickerPath, folder.name];
      this.selectedFile = null;
    },

    selectFilePickerFile(file) {
      this.selectedFile = file;
    },

    openSelectedViewerFile() {
      if (!this.selectedFile) return;
      const file = this.selectedFile;
      this.closeFilePicker();
      this.openFile(file);
    },

    chooseProfilePicture() {
      if (!this.selectedFile || !this.selectedFile.mime?.startsWith("image/"))
        return;
      this.userProfile.avatar = this.selectedFile.content;
      this.saveProfile();
      this.closeFilePicker();
    },

    saveProfile() {
      this.userProfile.name = this.userProfile.name.trim() || "Alex";
      this.syncUserFolder();
      window.localStorage.setItem(
        "win7-profile",
        JSON.stringify({
          name: this.userProfile.name,
          password: this.userProfile.password,
          avatar: this.userProfile.avatar,
        })
      );
    },

    loadProfile() {
      const storedProfile = window.localStorage.getItem("win7-profile");
      if (!storedProfile) return;

      try {
        const profile = JSON.parse(storedProfile);
        if (typeof profile.name === "string")
          this.userProfile.name = profile.name;
        if (typeof profile.password === "string")
          this.userProfile.password = profile.password;
        if (typeof profile.avatar === "string")
          this.userProfile.avatar = profile.avatar;
      } catch {
        window.localStorage.removeItem("win7-profile");
      }
    },

    syncUserFolder() {
      const usersFolder = this.fileSystem.children.find(
        (item) => item.name === "Users"
      );
      if (!usersFolder) return;
      let userFolder = usersFolder.children.find(
        (item) => item.name === this.userProfile.name
      );
      if (!userFolder) {
        userFolder = {
          name: this.userProfile.name,
          type: "folder",
          protected: true,
          children: [],
        };
        usersFolder.children.push(userFolder);
      }
      this.ensureUserFolders(userFolder);
    },

    getUserFolder() {
      const usersFolder = this.fileSystem.children.find(
        (item) => item.name === "Users"
      );
      return usersFolder?.children.find(
        (item) => item.name === this.userProfile.name
      );
    },

    getUserFolderChild(name) {
      return this.getUserFolder()?.children.find((item) => item.name === name);
    },

    getUploadFolder(file) {
      const extension = file.name.split(".").pop().toLowerCase();
      const mime = file.type || "";
      let folderName = "Documents";

      if (mime.startsWith("image/")) folderName = "Pictures";
      else if (mime.startsWith("video/")) folderName = "Videos";
      else if (
        mime.startsWith("audio/") ||
        ["mp3", "wav"].includes(extension)
      ) {
        folderName = "Music";
      } else if (["txt", "edpub", "epub", "pdf", "docx"].includes(extension)) {
        folderName = "Documents";
      }

      return this.getUserFolderChild(folderName);
    },

    ensureUserFolders(userFolder) {
      const folderNames = [
        "Downloads",
        "Documents",
        "Music",
        "Videos",
        "Pictures",
        "Desktop",
      ];
      folderNames.forEach((name) => {
        if (!userFolder.children.some((item) => item.name === name)) {
          userFolder.children.push({
            name,
            type: "folder",
            protected: true,
            children: [],
          });
        }
      });
    },

    createFileStorageKey() {
      return `file-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    },

    openFileDatabase() {
      return new Promise((resolve, reject) => {
        const request = window.indexedDB.open("win7-file-storage", 1);
        request.onupgradeneeded = () => {
          request.result.createObjectStore("files");
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    },

    storeUploadedFile(file, storageKey) {
      return this.openFileDatabase().then(
        (database) =>
          new Promise((resolve, reject) => {
            const transaction = database.transaction("files", "readwrite");
            transaction.objectStore("files").put(file, storageKey);
            transaction.oncomplete = () => {
              database.close();
              resolve(URL.createObjectURL(file));
            };
            transaction.onerror = () => {
              database.close();
              reject(transaction.error);
            };
          })
      );
    },

    deleteStoredFile(storageKey) {
      if (!storageKey) return Promise.resolve();
      return this.openFileDatabase().then(
        (database) =>
          new Promise((resolve, reject) => {
            const transaction = database.transaction("files", "readwrite");
            transaction.objectStore("files").delete(storageKey);
            transaction.oncomplete = () => {
              database.close();
              resolve();
            };
            transaction.onerror = () => {
              database.close();
              reject(transaction.error);
            };
          })
      );
    },

    loadStoredFile(storageKey, file) {
      return this.openFileDatabase().then(
        (database) =>
          new Promise((resolve, reject) => {
            const request = database
              .transaction("files", "readonly")
              .objectStore("files")
              .get(storageKey);
            request.onsuccess = () => {
              database.close();
              if (request.result) {
                this.$set(file, "content", URL.createObjectURL(request.result));
              }
              resolve();
            };
            request.onerror = () => {
              database.close();
              reject(request.error);
            };
          })
      );
    },

    hydrateStoredFiles(folder) {
      const fileLoads = [];
      (folder.children || []).forEach((item) => {
        if (item.type === "folder") {
          fileLoads.push(this.hydrateStoredFiles(item));
        } else if (item.storageKey) {
          fileLoads.push(this.loadStoredFile(item.storageKey, item));
        }
      });
      return Promise.all(fileLoads);
    },

    serializeFileSystem(folder) {
      return {
        ...folder,
        children: (folder.children || []).map((item) =>
          item.type === "folder"
            ? this.serializeFileSystem(item)
            : {
                ...item,
                content: item.storageKey ? undefined : item.content,
              }
        ),
      };
    },

    loadFileSystem() {
      const storedFileSystem = window.localStorage.getItem("win7-files");
      if (!storedFileSystem) return;

      try {
        const parsedFileSystem = JSON.parse(storedFileSystem);
        if (parsedFileSystem && Array.isArray(parsedFileSystem.children)) {
          this.fileSystem = parsedFileSystem;
          this.hydrateStoredFiles(this.fileSystem).catch(() => {
            this.showStorageError("Unable to load one or more saved files.");
          });
        }
      } catch {
        window.localStorage.removeItem("win7-files");
      }
    },

    saveFileSystem() {
      try {
        window.localStorage.setItem(
          "win7-files",
          JSON.stringify(this.serializeFileSystem(this.fileSystem))
        );
        return true;
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "QuotaExceededError"
        ) {
          this.showStorageError(
            "There is not enough browser storage to save this file. Remove some saved files or upload a smaller file."
          );
          return false;
        }
        throw error;
      }
    },

    saveNoteFile() {
      const fileName = this.saveFileName.trim();
      if (!fileName) return;

      const folder = this.filePickerFolder;
      const noteFile = {
        name: fileName.endsWith(".txt") ? fileName : `${fileName}.txt`,
        type: "file",
        protected: false,
        mime: "text/plain",
        content: `data:text/plain;charset=utf-8,${encodeURIComponent(
          this.notepadContent
        )}`,
      };
      this.notepadFileName = noteFile.name;
      const existingIndex = folder.children.findIndex(
        (item) => item.name === noteFile.name
      );
      if (existingIndex === -1) folder.children.push(noteFile);
      else this.$set(folder.children, existingIndex, noteFile);
      if (!this.saveFileSystem()) return;
      this.closeFilePicker();
    },

    saveNote() {
      this.openSaveAsPicker();
    },

    loadNote() {
      const storedNote = window.localStorage.getItem("win7-note");
      if (storedNote !== null) this.notepadContent = storedNote;
    },

    saveDesktopIconPositions() {
      window.localStorage.setItem(
        "win7-desktop-icons",
        JSON.stringify(this.desktopIconPositions)
      );
      window.localStorage.setItem(
        "win7-installed-program-icons",
        JSON.stringify(this.installedProgramPositions)
      );
    },

    saveInstalledProgramShortcuts() {
      window.localStorage.setItem(
        "win7-installed-program-shortcuts",
        JSON.stringify(this.installedProgramShortcuts)
      );
    },

    loadInstalledProgramShortcuts() {
      const storedShortcuts = window.localStorage.getItem(
        "win7-installed-program-shortcuts"
      );
      if (!storedShortcuts) return;
      try {
        this.installedProgramShortcuts = JSON.parse(storedShortcuts) || {};
      } catch {
        window.localStorage.removeItem("win7-installed-program-shortcuts");
      }
    },

    loadDesktopIconPositions() {
      const storedPositions = window.localStorage.getItem("win7-desktop-icons");
      if (storedPositions) {
        try {
          const positions = JSON.parse(storedPositions);
          Object.keys(this.desktopIconPositions).forEach((iconName) => {
            const position = positions[iconName];
            if (
              position &&
              Number.isFinite(position.top) &&
              Number.isFinite(position.left)
            ) {
              this.desktopIconPositions[iconName] = {
                top: position.top,
                left: position.left,
              };
            }
          });
        } catch {
          window.localStorage.removeItem("win7-desktop-icons");
        }
      }

      const storedProgramPositions = window.localStorage.getItem(
        "win7-installed-program-icons"
      );
      if (!storedProgramPositions) return;
      try {
        const positions = JSON.parse(storedProgramPositions);
        Object.keys(positions).forEach((programPath) => {
          const position = positions[programPath];
          if (
            position &&
            Number.isFinite(position.top) &&
            Number.isFinite(position.left)
          ) {
            this.$set(this.installedProgramPositions, programPath, {
              top: position.top,
              left: position.left,
            });
          }
        });
      } catch {
        window.localStorage.removeItem("win7-installed-program-icons");
      }
    },

    startIconDrag(event, iconName) {
      const position = this.desktopIconPositions[iconName];
      if (!position) return;

      this.dragState.isDragging = true;
      this.dragState.targetIcon = iconName;
      this.dragState.targetProgram = null;
      this.dragState.startX = event.clientX;
      this.dragState.startY = event.clientY;
      this.dragState.startTop = position.top;
      this.dragState.startLeft = position.left;
    },

    startDrag(event, windowName) {
      const target = this.windows[windowName];
      if (!target || target.maximized) return;

      this.setActive(windowName);
      this.dragState.isDragging = true;
      this.dragState.targetWindow = windowName;
      this.dragState.targetIcon = null;
      this.dragState.targetProgram = null;
      this.dragState.startX = event.clientX;
      this.dragState.startY = event.clientY;
      this.dragState.startTop = target.top;
      this.dragState.startLeft = target.left;
    },

    startProgramDrag(event, program) {
      const position = this.installedProgramPositions[program.path] || {
        top: 18 + Math.floor(this.desktopPrograms.indexOf(program) / 4) * 102,
        left: 230 + (this.desktopPrograms.indexOf(program) % 4) * 105,
      };
      this.$set(this.installedProgramPositions, program.path, { ...position });
      this.dragState.isDragging = true;
      this.dragState.targetProgram = program.path;
      this.dragState.targetIcon = null;
      this.dragState.targetWindow = null;
      this.dragState.startX = event.clientX;
      this.dragState.startY = event.clientY;
      this.dragState.startTop = position.top;
      this.dragState.startLeft = position.left;
    },

    startResize(event) {
      const element = event.currentTarget.parentElement;
      if (!element || element.classList.contains("maximized")) return;

      this.stopResize();
      const bounds = element.getBoundingClientRect();
      this.resizeState.isResizing = true;
      this.resizeState.element = element;
      this.resizeState.startX = event.clientX;
      this.resizeState.startY = event.clientY;
      this.resizeState.startWidth = bounds.width;
      this.resizeState.startHeight = bounds.height;
      this.resizeState.minWidth = element.classList.contains("wine-gui-window")
        ? 320
        : 280;
      this.resizeState.minHeight = element.classList.contains("wine-gui-window")
        ? 220
        : 180;
      document.addEventListener("mousemove", this.handleResize);
      document.addEventListener("mouseup", this.stopResize);
    },

    handleResize(event) {
      if (!this.resizeState.isResizing) return;

      const { element } = this.resizeState;
      if (!element) return;
      element.style.width = `${Math.max(
        this.resizeState.minWidth,
        this.resizeState.startWidth + event.clientX - this.resizeState.startX
      )}px`;
      element.style.height = `${Math.max(
        this.resizeState.minHeight,
        this.resizeState.startHeight + event.clientY - this.resizeState.startY
      )}px`;
    },

    stopResize() {
      if (!this.resizeState.isResizing) return;
      document.removeEventListener("mousemove", this.handleResize);
      document.removeEventListener("mouseup", this.stopResize);
      this.resizeState.isResizing = false;
      this.resizeState.element = null;
    },

    handleDrag(event) {
      if (!this.dragState.isDragging) return;

      if (this.dragState.targetIcon) {
        const position = this.desktopIconPositions[this.dragState.targetIcon];
        if (!position) return;

        position.left =
          this.dragState.startLeft + event.clientX - this.dragState.startX;
        position.top =
          this.dragState.startTop + event.clientY - this.dragState.startY;
        return;
      }

      if (this.dragState.targetProgram) {
        const position =
          this.installedProgramPositions[this.dragState.targetProgram];
        if (!position) return;
        position.left =
          this.dragState.startLeft + event.clientX - this.dragState.startX;
        position.top =
          this.dragState.startTop + event.clientY - this.dragState.startY;
        return;
      }

      const target =
        this.windows[this.dragState.targetWindow] ||
        (this.dragState.targetWindow === "fileViewer" ? this.fileViewer : null);
      if (!target) return;

      const deltaX = event.clientX - this.dragState.startX;
      const deltaY = event.clientY - this.dragState.startY;
      target.left = this.dragState.startLeft + deltaX;
      target.top = this.dragState.startTop + deltaY;
    },

    stopDrag() {
      this.stopResize();
      if (this.dragState.targetIcon || this.dragState.targetProgram) {
        this.saveDesktopIconPositions();
      }
      this.dragState.isDragging = false;
      this.dragState.targetWindow = null;
      this.dragState.targetIcon = null;
      this.dragState.targetProgram = null;
    },
  },
};
</script>
<style>
:root {
  font-family: "Segoe UI", Tahoma, sans-serif;
  color: #1d2b3a;
}
* {
  box-sizing: border-box;
}
html,
body,
#app {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
button,
input,
textarea {
  font: inherit;
}
.desktop-environment {
  --system-bar-height: 34px;
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  isolation: isolate;
  background: #0c5d91
    url("https://d08689390-byte.github.io/Extra-Stuff/my-windows7-simulator/background.jpeg")
    center / cover no-repeat;
}
.system-bar {
  position: absolute;
  z-index: 2100;
  top: 0;
  right: 0;
  left: 0;
  display: flex;
  align-items: center;
  gap: 7px;
  height: var(--system-bar-height);
  padding: 4px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.35);
  background: rgba(15, 72, 125, 0.78);
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.25);
}
.system-bar-button {
  padding: 4px 12px;
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: 3px;
  color: #fff;
  background: rgba(255, 255, 255, 0.16);
  cursor: pointer;
  font-size: 12px;
}
.system-bar-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
}
.system-bar-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.system-bar-status {
  overflow: hidden;
  color: rgba(255, 255, 255, 0.82);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.desktop-environment::before {
  position: absolute;
  z-index: -1;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(7, 42, 75, 0.18),
    rgba(27, 128, 183, 0.08)
  );
  content: "";
  pointer-events: none;
}
.desktop-shortcuts {
  position: absolute;
  z-index: 1;
  inset: 0;
  pointer-events: none;
}
.shortcut {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 5px 2px;
  color: #fff;
  text-align: center;
  text-shadow: 1px 1px 2px #12436d;
  cursor: default;
  pointer-events: auto;
  user-select: none;
}
.shortcut:hover {
  border-radius: 4px;
  background: rgba(96, 182, 232, 0.35);
  outline: 1px solid rgba(255, 255, 255, 0.5);
}
.shortcut-icon,
.win7-app-small-icon {
  position: relative;
  width: 38px;
  height: 38px;
  border-radius: 7px;
  box-shadow: inset 1px 1px rgba(255, 255, 255, 0.7),
    1px 2px 3px rgba(0, 0, 0, 0.35);
}
.program-icon {
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(#79b8eb, #23649f);
  font-size: 10px;
  font-weight: 700;
}
.custom-icon {
  position: absolute;
  z-index: 1;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  object-fit: contain;
}
.computer-icon,
.computer-mini {
  background: linear-gradient(#d8f6ff 0 8%, #64b7e9 9% 82%, #3773ab 83%);
}
.computer-icon::before,
.computer-mini::before {
  position: absolute;
  inset: 5px 5px 10px;
  border: 2px solid #fff;
  border-radius: 2px;
  background: linear-gradient(135deg, #bff1ff, #4a93ca);
  content: "";
}
.computer-icon::after,
.computer-mini::after {
  position: absolute;
  right: 7px;
  bottom: 4px;
  left: 7px;
  height: 3px;
  border-radius: 2px;
  background: #f7fbff;
  content: "";
}
.file-manager-mini {
  background: linear-gradient(#fff4c4 0 22%, #e8b94f 23% 82%, #b77c22 83%);
}
.file-manager-mini::before {
  position: absolute;
  inset: 5px 3px 4px;
  border: 1px solid #9a6b1c;
  border-radius: 2px;
  background: linear-gradient(135deg, #fff5be, #d89c2c);
  content: "";
}
.notepad-icon,
.notepad-mini {
  border: 1px solid #3676ac;
  background: linear-gradient(90deg, #fff 0 70%, #f2c557 71%);
}
.notepad-icon::before,
.notepad-mini::before {
  position: absolute;
  inset: 8px 7px;
  border-top: 2px solid #74a8cb;
  border-bottom: 2px solid #74a8cb;
  content: "";
}
.notepad-icon::after,
.notepad-mini::after {
  position: absolute;
  top: 15px;
  right: 7px;
  left: 7px;
  height: 2px;
  background: #74a8cb;
  box-shadow: 0 4px #74a8cb;
  content: "";
}
.control-panel-icon {
  background: linear-gradient(#f9dc79, #b98212);
}
.control-panel-icon::after {
  position: absolute;
  inset: 5px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    #fff 0 12%,
    #d18b16 14% 27%,
    #fff 29% 42%,
    #7d5314 44% 100%
  );
  content: "";
}
.recycle-icon {
  background: linear-gradient(#d8f1ff, #72a8cd);
}
.recycle-icon::after {
  position: absolute;
  inset: 5px;
  border: 2px solid #fff;
  border-top: 0;
  border-radius: 0 0 6px 6px;
  transform: skew(-8deg);
  content: "";
}
.shortcut-label {
  width: 84px;
  font-size: 12px;
  line-height: 15px;
}
.window {
  position: absolute;
  min-width: 280px;
  min-height: 180px;
  overflow: auto;
  overflow: hidden;
  min-width: 320px;
  min-height: 220px;
  border: 1px solid #174b7b;
  border-radius: 7px 7px 2px 2px;
  background: #f0f4f8;
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.42),
    0 0 0 1px rgba(255, 255, 255, 0.45);
}
.window.minimized {
  display: none;
}
.window-resize-handle {
  position: absolute;
  right: 0;
  bottom: 0;
  z-index: 4;
  width: 18px;
  height: 18px;
  pointer-events: auto;
  cursor: nwse-resize;
}
.window-resize-handle::after {
  position: absolute;
  right: 3px;
  bottom: 3px;
  width: 8px;
  height: 8px;
  border-right: 2px solid #5b7890;
  border-bottom: 2px solid #5b7890;
  content: "";
}
.notepad-window {
  width: 570px;
  height: 430px;
}
.file-viewer-window {
  width: 560px;
  height: 390px;
}
.file-viewer-body {
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(100% - 31px);
  overflow: auto;
  padding: 20px;
  background: #fff;
}
.viewer-image,
.viewer-video {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.viewer-audio,
.viewer-document,
.viewer-launcher,
.viewer-media {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #263d52;
  text-align: center;
}
.viewer-launcher {
  max-width: 360px;
}
.viewer-launcher h2,
.viewer-launcher p {
  margin: 0;
}
.viewer-launcher p {
  color: #687d8f;
  font-size: 12px;
}
.viewer-app-mark {
  display: grid;
  width: 76px;
  height: 76px;
  place-items: center;
  border: 1px solid #6f9fc0;
  border-radius: 16px;
  color: #fff;
  background: linear-gradient(145deg, #41a8e7, #155a96);
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.6),
    0 5px 12px rgba(30, 75, 110, 0.25);
  font-size: 24px;
  font-weight: 700;
}
.viewer-app-document {
  color: #fff;
  background: linear-gradient(145deg, #4db4f0, #205d9a);
}
.viewer-app-pdf {
  background: linear-gradient(145deg, #ef6c6c, #9f2429);
}
.viewer-open-button,
.media-controls button {
  padding: 7px 22px;
  border: 1px solid #7194ad;
  border-radius: 4px;
  color: #183b56;
  background: linear-gradient(#fff, #cde2f1);
  cursor: pointer;
  font-weight: 600;
}
.viewer-open-button:hover,
.media-controls button:hover {
  background: linear-gradient(#fff, #b5d8ed);
}
.viewer-media {
  width: min(430px, 100%);
}
.media-screen {
  display: flex;
  width: 100%;
  min-height: 190px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 1px solid #193f61;
  border-radius: 7px;
  color: #e8f5ff;
  background: radial-gradient(circle at 50% 20%, #245a82, #0c1e31 72%);
  box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.45);
}
.media-play-mark {
  display: grid;
  width: 58px;
  height: 58px;
  place-items: center;
  border: 2px solid #b9e7ff;
  border-radius: 50%;
  color: #b9e7ff;
  font-size: 22px;
}
.media-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  color: #687d8f;
  font-size: 12px;
}
.viewer-placeholder-icon {
  display: grid;
  width: 64px;
  height: 64px;
  place-items: center;
  border: 1px solid #9aafc1;
  border-radius: 8px;
  color: #245c89;
  background: linear-gradient(#f9fbfd, #dce8f1);
  font-size: 19px;
  font-weight: 700;
}
.viewer-document h2,
.viewer-document p {
  margin: 0;
}
.viewer-document-editor {
  width: min(390px, 100%);
  min-height: 110px;
  resize: vertical;
  padding: 8px;
  border: 1px solid #aabccc;
  border-radius: 4px;
  color: #263d52;
  background: #fff;
  font: 13px/1.4 "Segoe UI", Tahoma, sans-serif;
}
.viewer-note {
  color: #687d8f;
  font-size: 12px;
}
.document-page-viewer,
.pdf-page-viewer {
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 24px;
  background: #d7dce1;
}
.document-page {
  width: min(816px, 100%);
  min-height: 1056px;
  margin: 0 auto;
  padding: 76px 82px;
  color: #202020;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
  font-family: Calibri, Arial, sans-serif;
  font-size: 15px;
  line-height: 1.45;
}
.document-page img {
  max-width: 100%;
}
.document-page h1,
.document-page h2,
.document-page h3 {
  color: #1f1f1f;
}
.pdf-page-viewer {
  padding: 0;
  background: #525659;
}
.pdf-page-frame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}
.wine-terminal-window {
  width: 620px;
  height: 390px;
  background: #101010;
}
.wine-terminal-output,
.wine-process-list {
  height: calc(100% - 75px);
  margin: 0;
  overflow: auto;
  padding: 14px;
  color: #d7f7d7;
  background: #101010;
  font: 13px/1.45 Consolas, monospace;
  white-space: pre-wrap;
}
.wine-terminal-form {
  display: flex;
  gap: 7px;
  padding: 9px 12px;
  color: #d7f7d7;
  background: #101010;
  font: 13px Consolas, monospace;
}
.wine-terminal-form input {
  flex: 1;
  border: 0;
  outline: 0;
  color: inherit;
  background: transparent;
  font: inherit;
}
.wine-task-manager-window {
  width: 650px;
  height: 420px;
}
.wine-task-manager-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  color: #526b7e;
  font-size: 12px;
}
.wine-task-manager-toolbar button {
  padding: 5px 12px;
}
.wine-process-list {
  height: calc(100% - 76px);
  color: #263d52;
  background: #fff;
  white-space: pre;
}
.explorer-window {
  width: 680px;
  height: 450px;
}
.control-panel-window {
  width: 520px;
  height: 350px;
}
.window.maximized {
  top: var(--system-bar-height) !important;
  left: 0 !important;
  right: 0;
  bottom: 38px;
  width: auto !important;
  height: auto !important;
  border-radius: 0;
}
.title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 31px;
  padding-left: 9px;
  color: #fff;
  background: linear-gradient(
    #6fbbef 0%,
    #2d7fbd 47%,
    #175b9d 51%,
    #2b80bf 100%
  );
  text-shadow: 1px 1px 2px #174c7b;
  cursor: move;
  user-select: none;
}
.title-bar-text {
  display: flex;
  align-items: center;
  gap: 7px;
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}
.win7-app-small-icon {
  width: 18px;
  height: 18px;
  border-radius: 3px;
}
.title-bar-controls {
  display: flex;
  gap: 2px;
  align-self: stretch;
  padding: 3px 4px 3px 0;
}
.title-bar-controls button {
  position: relative;
  width: 27px;
  border: 1px solid rgba(255, 255, 255, 0.65);
  border-radius: 3px;
  color: #fff;
  background: linear-gradient(#6cbbec, #1c68aa);
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.45);
  cursor: pointer;
}
.title-bar-controls button:hover {
  background: linear-gradient(#a4ddfa, #3186c9);
}
.title-bar-controls button:focus-visible,
.nav-btn:focus-visible,
.control-panel-content button:focus-visible,
.taskbar-button:focus-visible,
.start-orb:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 1px;
}
.title-bar-controls button::before {
  position: absolute;
  top: 11px;
  left: 8px;
  width: 9px;
  height: 1px;
  background: currentColor;
  content: "";
}
.title-bar-controls button[aria-label="Maximize"]::before {
  top: 8px;
  height: 8px;
  border: 1px solid currentColor;
  background: transparent;
}
.title-bar-controls button[aria-label="Close"] {
  background: linear-gradient(#ed8a87, #b52e31);
}
.title-bar-controls button[aria-label="Close"]::after {
  display: none;
}
.title-bar-controls button[aria-label="Close"]::before {
  top: 3px;
  left: 0;
  width: 100%;
  height: auto;
  background: transparent;
  content: "×";
  font-size: 17px;
  line-height: 21px;
  text-align: center;
  transform: none;
}
.window-body {
  display: flex;
  flex-direction: column;
  height: calc(100% - 31px);
}
.menu-bar {
  display: flex;
  gap: 18px;
  padding: 5px 9px;
  border-bottom: 1px solid #bac8d4;
  color: #202c38;
  background: #f5f8fb;
  font-size: 12px;
}
.menu-bar span:first-child {
  font-weight: 600;
}
.menu-item {
  cursor: pointer;
}
.menu-item:hover {
  text-decoration: underline;
}
.notepad-editor {
  flex: 1;
  width: 100%;
  resize: none;
  border: 0;
  outline: 0;
  padding: 9px;
  color: #18222d;
  background: #fff;
  font: 14px/1.45 Consolas, monospace;
}
.explorer-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 8px;
  border-bottom: 1px solid #c1ced9;
  background: linear-gradient(#f9fbfd, #dce8f1);
}
.nav-btn {
  width: 29px;
  height: 26px;
  border: 1px solid #9aafc1;
  border-radius: 3px;
  color: #345b7a;
  background: linear-gradient(#fff, #d5e4ef);
  cursor: pointer;
}
.address-bar,
.search-box {
  height: 26px;
  border: 1px solid #9aafc1;
  border-radius: 2px;
  background: #fff;
}
.address-bar {
  flex: 1;
  padding: 4px 9px;
  color: #3a526a;
  font-size: 12px;
}
.search-box {
  width: 150px;
  padding: 4px 8px;
  color: #43586b;
  font-size: 12px;
}
.explorer-layout {
  display: flex;
  min-height: 0;
  height: calc(100% - 73px);
}
.explorer-sidebar {
  width: 155px;
  padding: 15px 11px;
  border-right: 1px solid #c5d3df;
  background: linear-gradient(90deg, #eaf3fa, #d8e7f2);
}
.sidebar-group {
  padding: 8px;
  border-bottom: 1px solid #c0d1df;
  color: #205b8d;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.sidebar-group:hover {
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.55);
}
.sidebar-group-active {
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.7);
}
.sidebar-shortcut {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 6px 8px;
  border: 0;
  border-bottom: 1px solid rgba(192, 209, 223, 0.65);
  color: #205b8d;
  background: transparent;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  text-align: left;
}
.sidebar-shortcut:hover {
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.55);
}
.sidebar-shortcut-icon {
  width: 18px;
  color: #3475a5;
  text-align: center;
}
.explorer-main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: 15px 20px;
  background: #fff;
}
.explorer-main h3 {
  margin: 0 0 18px;
  color: #245c89;
  font-size: 16px;
  font-weight: 400;
}
.drive-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 250px;
  padding: 10px;
  border: 1px solid transparent;
  border-radius: 4px;
  color: #263d52;
  font-size: 13px;
  cursor: pointer;
}
.drive-item:hover {
  border-color: #9dc8e5;
  background: #e5f3fc;
}
.drive-name {
  color: #205b8d;
  text-decoration: underline;
}
.file-list-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}
.file-list-header .nav-btn {
  width: auto;
  min-width: 58px;
  padding: 0 10px;
  white-space: nowrap;
}
.file-list-header h3 {
  margin-bottom: 5px;
}
.file-list-header p {
  margin: 0;
  color: #687d8f;
  font-size: 12px;
}
.file-list {
  display: grid;
  gap: 6px;
  margin-top: 16px;
}
.file-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: 4px;
}
.file-item:hover {
  border-color: #9dc8e5;
  background: #e5f3fc;
}
.file-item-icon {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  font-size: 22px;
}
.file-item-details {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  color: #263d52;
  font-size: 13px;
}
.file-item-details small {
  color: #687d8f;
  font-size: 10px;
}
.context-menu {
  position: fixed;
  z-index: 3500;
  display: grid;
  min-width: 150px;
  padding: 4px;
  border: 1px solid #8199ad;
  border-radius: 3px;
  background: #f7fbfe;
  box-shadow: 2px 3px 10px rgba(0, 0, 0, 0.3);
}
.context-menu button,
.context-menu-disabled {
  width: 100%;
  padding: 7px 12px;
  border: 0;
  color: #263d52;
  background: transparent;
  font-size: 12px;
  text-align: left;
  white-space: nowrap;
}
.context-menu button {
  cursor: pointer;
}
.context-menu button:hover {
  color: #fff;
  background: #3184c2;
}
.context-menu-disabled {
  color: #8798a6;
  cursor: default;
}
.file-picker-dialog {
  width: min(520px, calc(100% - 32px));
  max-height: min(620px, calc(100% - 32px));
  overflow: auto;
  padding: 18px;
  border: 1px solid #174b7b;
  border-radius: 5px;
  background: #f0f4f8;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);
}
.open-with-dialog {
  width: min(440px, calc(100% - 32px));
  padding: 18px;
  border: 1px solid #174b7b;
  border-radius: 5px;
  background: #f0f4f8;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);
}
.open-with-dialog p {
  margin: 10px 0;
  color: #526b7e;
  font-size: 12px;
}
.open-with-list {
  display: grid;
  gap: 5px;
}
.open-with-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px;
  border: 1px solid #c5d3df;
  color: #263d52;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  text-align: left;
}
.open-with-item:hover {
  border-color: #9dc8e5;
  background: #e5f3fc;
}
.open-with-icon {
  display: inline-flex;
  width: 34px;
  height: 28px;
  align-items: center;
  justify-content: center;
  color: #245579;
  font-size: 13px;
  font-weight: 700;
}
.file-picker-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.file-picker-title h2 {
  margin: 0;
  color: #245579;
  font-size: 18px;
  font-weight: 400;
}
.file-picker-close {
  border: 0;
  color: #5b7182;
  background: transparent;
  cursor: pointer;
  font-size: 22px;
  line-height: 1;
}
.file-picker-dialog > p {
  margin: 8px 0;
  color: #526b7e;
  font-size: 12px;
}
.file-picker-path {
  margin: 12px 0 8px;
  padding: 7px 9px;
  border: 1px solid #aabccc;
  background: #fff;
  color: #43586b;
  font: 12px Consolas, monospace;
}
.file-picker-list {
  display: grid;
  gap: 4px;
  min-height: 100px;
  max-height: 250px;
  overflow: auto;
  padding: 5px;
  border: 1px solid #c5d3df;
  background: #fff;
}
.file-picker-item {
  padding: 8px;
  border: 1px solid transparent;
  color: #263d52;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  text-align: left;
}
.file-picker-item:hover,
.file-picker-selected {
  border-color: #9dc8e5;
  background: #e5f3fc;
}
.save-file-name {
  width: 100%;
  margin-top: 10px;
  padding: 7px 8px;
  border: 1px solid #aabccc;
  border-radius: 3px;
  background: #fff;
}
.drive-icon-large {
  position: relative;
  flex: 0 0 40px;
  width: 40px;
  height: 32px;
  border: 1px solid #7192ab;
  border-radius: 3px;
  background: linear-gradient(#e9f4fb 0 35%, #9bb9cd 36% 70%, #587f9d 71%);
  box-shadow: inset 0 2px rgba(255, 255, 255, 0.75);
}
.drive-icon-large .custom-icon {
  inset: 3px;
  width: 34px;
  height: 26px;
  border-radius: 0;
}
.drive-progress-bar {
  width: 155px;
  height: 9px;
  margin-top: 5px;
  overflow: hidden;
  border: 1px solid #aebdca;
  border-radius: 2px;
  background: #edf2f5;
}
.fill-bar {
  width: 35%;
  height: 100%;
  background: linear-gradient(#9ad45d, #4b9e1d);
}
.drive-item small {
  color: #687d8f;
  font-size: 10px;
}
.recycle-bin-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}
.recycle-bin-header h3 {
  margin-bottom: 5px;
}
.recycle-bin-header p {
  margin: 0;
  color: #687d8f;
  font-size: 12px;
}
.delete-all-button,
.dialog-actions button {
  padding: 6px 12px;
  border: 1px solid #7194ad;
  border-radius: 3px;
  color: #183b56;
  background: linear-gradient(#fff, #cde2f1);
  cursor: pointer;
}
.delete-all-button:hover,
.dialog-actions button:hover {
  background: linear-gradient(#fff, #b5d8eb);
}
.recycle-bin-items {
  margin-top: 20px;
}
.recycle-bin-item {
  padding: 8px 10px;
  border-bottom: 1px solid #d5e0e8;
  color: #263d52;
  font-size: 13px;
}
.dialog-backdrop {
  position: absolute;
  z-index: 3000;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 25, 50, 0.35);
}
.delete-dialog {
  width: min(360px, calc(100% - 32px));
  padding: 20px;
  border: 1px solid #174b7b;
  border-radius: 5px;
  background: #f0f4f8;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);
}
.delete-dialog h2 {
  margin: 0 0 10px;
  color: #245579;
  font-size: 17px;
  font-weight: 400;
}
.delete-dialog p {
  margin: 0;
  color: #263d52;
  font-size: 13px;
  line-height: 1.5;
}
.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}
.error-dialog-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.error-icon {
  display: grid;
  flex: 0 0 24px;
  width: 24px;
  height: 24px;
  place-items: center;
  border: 2px solid #b52e31;
  border-radius: 50%;
  color: #b52e31;
  font-size: 17px;
  font-weight: 700;
}
.notification-icon {
  display: grid;
  flex: 0 0 24px;
  width: 24px;
  height: 24px;
  place-items: center;
  border: 2px solid #2b8a57;
  border-radius: 50%;
  color: #2b8a57;
  font-size: 16px;
  font-weight: 700;
}
.error-dialog h2 {
  margin-bottom: 5px;
}
.control-panel-layout {
  display: flex;
  height: calc(100% - 31px);
  padding: 25px;
  gap: 28px;
  background: linear-gradient(135deg, #eef5fb, #d6e5f1);
}
.user-card {
  width: 130px;
  text-align: center;
}
.profile-avatar,
.start-avatar {
  object-fit: cover;
  border: 2px solid #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
}
.profile-avatar {
  width: 88px;
  height: 88px;
}
.user-card h3 {
  margin: 8px 0;
  color: #245579;
  font-size: 15px;
  font-weight: 400;
  overflow-wrap: anywhere;
}
.control-panel-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
}
.control-panel-content h2 {
  margin: 0 0 5px;
  color: #245579;
  font-size: 20px;
  font-weight: 400;
}
.control-panel-content input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #aabccc;
  border-radius: 3px;
  background: #fff;
}
.control-panel-content input:focus {
  border-color: #3e94cf;
  outline: 2px solid rgba(62, 148, 207, 0.25);
}
.control-panel-content button {
  align-self: flex-start;
  padding: 6px 15px;
  border: 1px solid #7194ad;
  border-radius: 3px;
  color: #183b56;
  background: linear-gradient(#fff, #cde2f1);
  cursor: pointer;
}
.start-menu {
  position: absolute;
  z-index: 1000;
  bottom: 38px;
  left: 4px;
  display: flex;
  width: 390px;
  min-height: 250px;
  overflow: hidden;
  border: 1px solid #194c7b;
  border-radius: 7px 7px 0 0;
  color: #fff;
  background: linear-gradient(90deg, #f8fbfe 0 65%, #1a5d97 65%);
  box-shadow: 0 0 18px rgba(0, 0, 0, 0.45);
}
.start-menu-left {
  flex: 1;
  padding: 12px 8px;
  color: #1e3348;
}
.start-item {
  padding: 12px 14px;
  border-radius: 3px;
  cursor: pointer;
}
.start-item:hover {
  color: #fff;
  background: #3184c2;
}
.start-item:active {
  background: #21699f;
}
.start-menu-right {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 35%;
  padding: 18px 8px;
  font-size: 13px;
  text-shadow: 1px 1px #164c7d;
}
.start-avatar {
  width: 54px;
  height: 54px;
  margin-bottom: 9px;
}
.shutdown-button {
  margin-top: auto;
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 3px;
  color: #fff;
  background: rgba(0, 0, 0, 0.2);
  cursor: pointer;
}
.shutdown-button:hover {
  background: rgba(255, 255, 255, 0.2);
}
.taskbar {
  position: absolute;
  z-index: 2000;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  height: 38px;
  padding: 0 5px;
  border-top: 1px solid #67b2e2;
  background: linear-gradient(
    rgba(39, 133, 195, 0.93),
    rgba(11, 72, 132, 0.97)
  );
  box-shadow: 0 -1px 5px rgba(0, 0, 0, 0.3);
}
.start-orb {
  position: relative;
  width: 42px;
  height: 42px;
  margin-top: -6px;
  border: 2px solid #c3f4ff;
  border-radius: 50%;
  background: radial-gradient(
    circle at 35% 25%,
    #f5ffff 0 8%,
    #7bd5ef 12% 28%,
    #176da7 70%
  );
  box-shadow: 0 0 5px rgba(255, 255, 255, 0.75);
  cursor: pointer;
}
.start-orb::before {
  position: absolute;
  top: 10px;
  left: 10px;
  width: 8px;
  height: 8px;
  border: 2px solid #fff;
  background: rgba(255, 255, 255, 0.25);
  box-shadow: 10px 0 rgba(255, 255, 255, 0.25), 0 10px rgba(255, 255, 255, 0.25),
    10px 10px rgba(255, 255, 255, 0.25);
  content: "";
}
.custom-icon-active {
  border: 0 !important;
  border-radius: 0;
  background: transparent !important;
  box-shadow: none !important;
}
.custom-icon-active::before,
.custom-icon-active::after {
  display: none !important;
}
.start-icon {
  position: absolute;
  z-index: 1;
  inset: 2px;
  width: calc(100% - 4px);
  height: calc(100% - 4px);
  border-radius: 50%;
  object-fit: contain;
}
.taskbar-apps {
  display: flex;
  gap: 4px;
  margin-left: 7px;
}
.taskbar-button {
  min-width: 112px;
  padding: 7px 13px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 3px;
  color: #fff;
  background: rgba(255, 255, 255, 0.15);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}
.taskbar-button:hover,
.taskbar-button.active {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.6);
}
.tray {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
  color: #fff;
}
.clock {
  min-width: 66px;
  font-size: 11px;
  line-height: 14px;
  text-align: center;
  text-shadow: 1px 1px #124a7e;
}
.show-desktop {
  width: 12px;
  height: 28px;
  border-left: 1px solid rgba(255, 255, 255, 0.55);
  background: rgba(255, 255, 255, 0.14);
  cursor: pointer;
}
.wine-gui-window {
  position: absolute;
  z-index: 2500;
  top: 8%;
  left: 8%;
  width: 84%;
  height: 78%;
  overflow: hidden;
  min-width: 320px;
  min-height: 220px;
  border: 1px solid #194c7b;
  border-radius: 6px;
  background: #111;
  box-shadow: 0 0 24px rgba(0, 0, 0, 0.6);
}
.wine-gui-window .window-titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 30px;
  padding: 0 7px 0 11px;
  color: #fff;
  background: linear-gradient(#4e9bd0, #1d5e9d);
  font-size: 13px;
  font-weight: 600;
}
.wine-gui-window .window-close {
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid #fff8;
  border-radius: 3px;
  color: #fff;
  background: #c94b4b;
  font-size: 17px;
  line-height: 17px;
  cursor: pointer;
}
.wine-gui-frame {
  display: block;
  width: 100%;
  height: calc(100% - 30px);
  border: 0;
  background: #000;
}
@media (max-width: 700px) {
  .window {
    top: calc(8% + var(--system-bar-height)) !important;
    left: 3% !important;
    right: 3%;
    width: auto !important;
  }
  .explorer-window,
  .notepad-window,
  .control-panel-window {
    height: calc(100% - 100px) !important;
  }
  .explorer-sidebar {
    width: 115px;
  }
  .search-box {
    display: none;
  }
  .start-menu {
    width: min(390px, calc(100% - 8px));
  }
  .taskbar-apps {
    min-width: 0;
    overflow: hidden;
  }
  .taskbar-button {
    min-width: 86px;
    padding-right: 8px;
    padding-left: 8px;
  }
  .clock {
    min-width: 58px;
  }
}
</style>

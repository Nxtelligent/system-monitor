# -*- mode: python ; coding: utf-8 -*-

import os
import site

root = os.path.abspath('.')

# Find the webview2 package directory for its DLLs and JS
webview2_dir = None
for sp in site.getsitepackages():
    candidate = os.path.join(sp, 'webview2')
    if os.path.isdir(candidate):
        webview2_dir = candidate
        break
if webview2_dir is None:
    # Fallback for virtualenvs
    import webview2 as _wv2
    webview2_dir = os.path.dirname(_wv2.__file__)

a = Analysis(
    ['app.py'],
    pathex=[root],
    binaries=[
        (os.path.join(webview2_dir, 'WebView2Loader.dll'), 'webview2'),
        (os.path.join(webview2_dir, 'Webview2Window.dll'), 'webview2'),
    ],
    datas=[
        (os.path.join(root, 'templates'), 'templates'),
        (os.path.join(root, 'static'), 'static'),
        (os.path.join(webview2_dir, 'webview2.js'), 'webview2'),
    ],
    hiddenimports=['webview2', 'webview2.base', 'webview2.bridge', 'voxe'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['PySide6', 'PyQt5', 'PyQt6', 'tkinter', 'unittest'],
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data)

exe = EXE(
    pyz,
    a.scripts,
    [],
    name='SystemMonitor',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='SystemMonitor',
)

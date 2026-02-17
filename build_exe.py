"""
Build helper – creates dist/SystemMonitor.exe

Usage:
    python build_exe.py
"""
import subprocess
import sys


def main():
    # Ensure PyInstaller is installed
    try:
        import PyInstaller  # noqa: F401
    except ImportError:
        print('Installing PyInstaller...')
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'pyinstaller'])

    print('Building SystemMonitor.exe ...')
    subprocess.check_call([
        sys.executable, '-m', 'PyInstaller',
        'system_monitor.spec',
        '--noconfirm',
    ])
    print()
    print('Done!  ->  dist\\SystemMonitor.exe')


if __name__ == '__main__':
    main()

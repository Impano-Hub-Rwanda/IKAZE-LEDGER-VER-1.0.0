# IkAZE-LEDGER

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-yy8cufod)
## Windows setup build from Ubuntu

This project is configured for a Windows NSIS setup (`.exe`). Tauri 2 documents Linux-to-Windows NSIS cross-compilation using the MSVC target and `cargo-xwin`.

```bash
sudo apt update
sudo apt install -y nsis lld llvm
rustup target add x86_64-pc-windows-msvc
cargo install --locked cargo-xwin
npm ci
npm run build:windows
```

The installer is generated under:

```text
src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/
```


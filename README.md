## picopico-web-editor
A Chrome extension that enhances the editor on picoruby.org/terminal.

## Features
- Syntax Highlight
- Display Row Number
- Type Support (experimental)
  - Type Check
  - Completion
  - Code Lens

## Install
```bash
git clone https://github.com/engneer-hamachan/picopico-web-editor

# Load the picopico-web-editor directory as an extension from Chrome settings
```

## ti.wasm
The ti.wasm included in this repository is built from the following project:
https://github.com/engneer-hamachan/mruby-ti-wasm

## Type Support (experimental)
The Type Support feature is experimental.

When the picopico-web-editor extension is enabled, a Type Support checkbox will appear to the right of the font size setting on picoruby.org/terminal. Check it to enable the feature.

Type Support currently covers only some PicoRuby classes. More classes will be supported in the future.

### Supported Classes
- `Array`
- `Bool` (true/false)
- `Float`
- `Hash`
- `Integer`
- `Kernel`
- `Math`
- `Nil`
- `Object`
- `Proc`
- `Range`
- `String`
- `Symbol`
- `ADC`
- `GPIO` / `GPIOError`
- `PWM`
- `RNG`
- `SPI`
- `UART`

## TODO
- [ ] Replace JS implementation with PicoRuby WASM
- [ ] Fix minor bugs
  - [ ] Completion sometimes does not work for arguments
  - [ ] Support `[]=` and `[]` methods
  - [ ] Support `hoge=` methods
  - [ ] Type checking breaks for functions with splat arguments
- [ ] Complete RBS support to achieve full Type Support based on PicoRuby's RBS

# Editor Performance A/B (React Compiler ON/OFF)

## Goal
Compare typing performance in the post editor with identical scenarios:
- `React Compiler ON`
- `React Compiler OFF`

## Run Modes
- ON: `pnpm dev:rc:on`
- OFF: `pnpm dev:rc:off`

Open: `http://localhost:3000/dev/editor-input-repro`

## Test Scenario (Same for ON/OFF)
1. Focus editor textarea.
2. Type English text continuously for 15 seconds.
3. Type Korean (IME) text continuously for 15 seconds.
4. Hold backspace for 5 seconds.
5. Paste a long markdown block (200+ lines) once.

Use exactly the same text and same duration in both runs.

## Metrics to Record
Use Chrome DevTools Performance + React DevTools Profiler:

1. Input latency:
- Performance panel -> record during typing.
- Check `Long tasks` count and duration.

2. React commit cost:
- React Profiler -> record same typing window.
- Compare `Commit count` and `Max commit duration`.

3. UX symptoms:
- Cursor jump count
- IME composition break count
- Noticeable frame drops (subjective, but record yes/no)

## Result Table Template
| Metric | RC ON | RC OFF | Better |
|---|---:|---:|---|
| Long tasks (count) |  |  |  |
| Longest long task (ms) |  |  |  |
| React commit count |  |  |  |
| Max commit duration (ms) |  |  |  |
| Cursor jumps (count) |  |  |  |
| IME breaks (count) |  |  |  |

## Interpretation
- Keep React Compiler ON if:
  - commit duration and long tasks are reduced or neutral, and
  - no regression in cursor/IME behavior.
- Keep OFF if:
  - input latency or IME behavior regresses.

# CodeForge Ephemeral Remote Code Execution: Sandbox Security Specification

## 1. Threat Model & Isolation Architecture
Untrusted user submissions in Python, C++, Java, and TypeScript are executed in ephemeral container runtimes designed to prevent:
1. Host filesystem enumeration and modification
2. Denial-of-service via thread starvation or fork bombs (`:(){ :|:& };:`)
3. Out-of-memory (OOM) host crashes
4. Unauthorized network egress or lateral movement to internal databases (PostgreSQL/Redis)

---

## 2. Invariant Matrix

| Invariant | Value | Enforcement Mechanism | Failure Response |
|---|---|---|---|
| **Wall Clock Timeout** | 5,000 ms | POSIX SIGKILL after timer expiration | Terminate process with `TIME_LIMIT_EXCEEDED` |
| **CPU Quota** | 1.0 vCPU | Linux cgroup `cpu.max: 100000 100000` | CPU throttled |
| **Memory Ceiling** | 256 MB | Linux cgroup v2 `memory.max: 268435456` | Kill child process with `MEMORY_LIMIT_EXCEEDED` |
| **Process Count (pids.max)** | 64 | Linux cgroup `pids.max: 64` | Reject `fork()` with `EAGAIN` |
| **Root Filesystem** | Read-Only | Docker `--read-only` flag | Reject writes with `EROFS` |
| **Ephemeral Scratch** | 32 MB tmpfs | Mount `tmpfs` at `/tmp` (`size=32m,noexec,nosuid`) | Reject writes when buffer fills |
| **Network Egress** | Disabled | Docker `--network none` | Drop all outbound TCP/UDP packets |

---

## 3. Automated Invariant Verification

Run the test harness locally or in CI:
```bash
npm run test:sandbox-invariants
```

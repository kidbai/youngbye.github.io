---
name: fix-100th-enemy-not-spawning
overview: 修复第一关击杀99个怪物后第100个怪物不出现的bug。问题出在 SpawnSystem 的 pause/resume 机制在升级暂停期间可能导致刷怪计时器丢失或无法恢复。
---


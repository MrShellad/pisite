backend/src/
  ├── handlers/
  │    ├── mod.rs          // 统一导出
  │    ├── auth.rs         // 登录、初始化🆗
  │    ├── hero.rs         // Hero 配置🆗
  │    ├── sponsors.rs     // 赞助商🆗
  │    ├── features.rs     // 核心特性🆗
  │    ├── changelog.rs    // 更新日志🆗
  │    ├── faqs.rs         // FAQ🆗
  │    ├── settings.rs     // 全局设置🆗
  │    ├── stats.rs        // 统计与 Dashboard🆗
  │    ├── upload.rs       // 文件上传
  │    └── misc.rs         // 其他（如友链）
  ├── main.rs
  └── routes.rs
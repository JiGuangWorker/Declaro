// Copyright (c) 2026 Declaro. All rights reserved.

package config

import (
	"fmt"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

// NewDB 按 DatabaseConfig 建立 GORM 连接并 ping 校验。
// 调用方应在启动阶段拿到 *gorm.DB 后注入各 module 的 repository。
func NewDB(c *DatabaseConfig, mode string) (*gorm.DB, error) {
	if c == nil || c.DSN == "" {
		return nil, fmt.Errorf("database.dsn is empty")
	}

	logLevel := gormlogger.Warn
	if mode == "debug" {
		logLevel = gormlogger.Info
	}

	db, err := gorm.Open(mysql.Open(c.DSN), &gorm.Config{
		Logger: gormlogger.Default.LogMode(logLevel),
	})
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("get *sql.DB: %w", err)
	}
	if c.MaxOpenConns > 0 {
		sqlDB.SetMaxOpenConns(c.MaxOpenConns)
	}
	if c.MaxIdleConns > 0 {
		sqlDB.SetMaxIdleConns(c.MaxIdleConns)
	}
	if c.ConnMaxLifetime > 0 {
		sqlDB.SetConnMaxLifetime(c.ConnMaxLifetime)
	}

	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("ping db: %w", err)
	}
	return db, nil
}

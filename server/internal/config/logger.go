// Copyright (c) 2026 Declaro. All rights reserved.

package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// NewLogger 按 LogConfig 构建 zap.Logger。
// format=console 适合开发期可读输出；format=json 适合生产期采集。
func NewLogger(c *LogConfig) (*zap.Logger, error) {
	if c == nil {
		c = &LogConfig{Level: "info", Format: "console", Output: "stdout"}
	}

	level := zapcore.InfoLevel
	switch strings.ToLower(c.Level) {
	case "debug":
		level = zapcore.DebugLevel
	case "info":
		level = zapcore.InfoLevel
	case "warn":
		level = zapcore.WarnLevel
	case "error":
		level = zapcore.ErrorLevel
	}

	var encoderCfg zapcore.EncoderConfig
	var encoder zapcore.Encoder
	if strings.ToLower(c.Format) == "json" {
		encoderCfg = zap.NewProductionEncoderConfig()
		encoderCfg.TimeKey = "ts"
		encoderCfg.EncodeTime = zapcore.ISO8601TimeEncoder
		encoder = zapcore.NewJSONEncoder(encoderCfg)
	} else {
		encoderCfg = zap.NewDevelopmentEncoderConfig()
		encoderCfg.EncodeLevel = zapcore.CapitalColorLevelEncoder
		encoder = zapcore.NewConsoleEncoder(encoderCfg)
	}

	ws, err := newWriteSyncer(c)
	if err != nil {
		return nil, err
	}

	core := zapcore.NewCore(encoder, ws, level)
	return zap.New(core, zap.AddCaller(), zap.AddCallerSkip(0)), nil
}

func newWriteSyncer(c *LogConfig) (zapcore.WriteSyncer, error) {
	switch strings.ToLower(c.Output) {
	case "", "stdout":
		return zapcore.AddSync(os.Stdout), nil
	case "file":
		if c.FilePath == "" {
			return nil, fmt.Errorf("log.output=file but log.file_path is empty")
		}
		if err := os.MkdirAll(filepath.Dir(c.FilePath), 0o755); err != nil {
			return nil, fmt.Errorf("mkdir log dir: %w", err)
		}
		f, err := os.OpenFile(c.FilePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
		if err != nil {
			return nil, fmt.Errorf("open log file: %w", err)
		}
		return zapcore.AddSync(f), nil
	default:
		return nil, fmt.Errorf("unsupported log.output: %s", c.Output)
	}
}

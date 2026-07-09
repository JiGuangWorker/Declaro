// Copyright (c) 2026 Declaro. All rights reserved.

// Package config 负责加载与持有服务端配置。
// 加载入口：Load(path)；全局读取：Get()。
// 配置优先级：环境变量 > 配置文件 > 默认值。
package config

import (
	"fmt"
	"strings"
	"time"

	"github.com/spf13/viper"
)

// Config 是服务端配置的根结构。新增配置段在此挂载，并补 mapstructure tag。
type Config struct {
	Server   ServerConfig   `mapstructure:"server"`
	Database DatabaseConfig `mapstructure:"database"`
	Redis    RedisConfig    `mapstructure:"redis"`
	JWT      JWTConfig      `mapstructure:"jwt"`
	Wechat   WechatConfig   `mapstructure:"wechat"`
	Log      LogConfig      `mapstructure:"log"`
	Storage  StorageConfig  `mapstructure:"storage"`
}

type ServerConfig struct {
	Port int    `mapstructure:"port"`
	Mode string `mapstructure:"mode"` // debug / release / test
}

type DatabaseConfig struct {
	Driver          string        `mapstructure:"driver"`
	DSN             string        `mapstructure:"dsn"`
	MaxOpenConns    int           `mapstructure:"max_open_conns"`
	MaxIdleConns    int           `mapstructure:"max_idle_conns"`
	ConnMaxLifetime time.Duration `mapstructure:"conn_max_lifetime"`
}

type RedisConfig struct {
	Addr     string `mapstructure:"addr"`
	Password string `mapstructure:"password"`
	DB       int    `mapstructure:"db"`
	PoolSize int    `mapstructure:"pool_size"`
}

type JWTConfig struct {
	Secret string `mapstructure:"secret"`
	Expire int    `mapstructure:"expire"` // 秒
	Issuer string `mapstructure:"issuer"`
}

type WechatConfig struct {
	AppID           string `mapstructure:"appid"`
	Secret          string `mapstructure:"secret"`
	Code2SessionURL string `mapstructure:"code2session_url"`
}

type LogConfig struct {
	Level    string `mapstructure:"level"`
	Format   string `mapstructure:"format"`
	Output   string `mapstructure:"output"`
	FilePath string `mapstructure:"file_path"`
}

type StorageConfig struct {
	Driver string       `mapstructure:"driver"`
	Local  LocalStorage `mapstructure:"local"`
}

type LocalStorage struct {
	BaseDir string `mapstructure:"base_dir"`
	BaseURL string `mapstructure:"base_url"`
}

var cfg *Config

// Load 从 path 加载配置文件，应用默认值并允许环境变量覆盖。
func Load(path string) (*Config, error) {
	v := viper.New()
	v.SetConfigFile(path)

	// 环境变量覆盖：DECLARO_SERVER_PORT → server.port
	v.SetEnvPrefix("DECLARO")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	// 默认值
	v.SetDefault("server.port", 8080)
	v.SetDefault("server.mode", "debug")
	v.SetDefault("database.max_open_conns", 50)
	v.SetDefault("database.max_idle_conns", 10)
	v.SetDefault("database.conn_max_lifetime", "30m")
	v.SetDefault("redis.pool_size", 10)
	v.SetDefault("jwt.expire", 7200)
	v.SetDefault("jwt.issuer", "declaro")
	v.SetDefault("log.level", "info")
	v.SetDefault("log.format", "console")
	v.SetDefault("log.output", "stdout")

	if err := v.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("read config %s: %w", path, err)
	}

	var c Config
	if err := v.Unmarshal(&c); err != nil {
		return nil, fmt.Errorf("unmarshal config: %w", err)
	}

	cfg = &c
	return cfg, nil
}

// Get 返回最后一次 Load 的配置。未 Load 前返回 nil。
func Get() *Config { return cfg }

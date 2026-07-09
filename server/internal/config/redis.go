// Copyright (c) 2026 Declaro. All rights reserved.

package config

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"
)

// NewRedis 建立 Redis 连接并 ping 校验。
// 用途：幂等键窗口、限流计数、质检任务暂存等。
func NewRedis(c *RedisConfig) (*redis.Client, error) {
	if c == nil || c.Addr == "" {
		return nil, fmt.Errorf("redis.addr is empty")
	}

	cli := redis.NewClient(&redis.Options{
		Addr:     c.Addr,
		Password: c.Password,
		DB:       c.DB,
		PoolSize: c.PoolSize,
	})

	if err := cli.Ping(context.Background()).Err(); err != nil {
		return nil, fmt.Errorf("ping redis: %w", err)
	}
	return cli, nil
}

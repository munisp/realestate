package config

import (
	"os"
)

type Config struct {
	TemporalHostPort  string
	TemporalNamespace string
	TaskQueue         string
	KafkaBrokers      []string
	RedisAddr         string
	DaprHTTPPort      string
	DaprGRPCPort      string
	TigerBeetleAddr   string
	DatabaseURL       string
}

func LoadConfig() *Config {
	return &Config{
		TemporalHostPort:  getEnv("TEMPORAL_HOST_PORT", "localhost:7233"),
		TemporalNamespace: getEnv("TEMPORAL_NAMESPACE", "default"),
		TaskQueue:         getEnv("TASK_QUEUE", "realestate-workflows"),
		KafkaBrokers:      []string{getEnv("KAFKA_BROKERS", "localhost:9092")},
		RedisAddr:         getEnv("REDIS_ADDR", "localhost:6379"),
		DaprHTTPPort:      getEnv("DAPR_HTTP_PORT", "3500"),
		DaprGRPCPort:      getEnv("DAPR_GRPC_PORT", "50001"),
		TigerBeetleAddr:   getEnv("TIGERBEETLE_ADDR", "localhost:3001"),
		DatabaseURL:       getEnv("DATABASE_URL", ""),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Redis    RedisConfig
	Keycloak KeycloakConfig
	JWT      JWTConfig
	Kafka    KafkaConfig
}

type ServerConfig struct {
	Port string
	Mode string
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

type RedisConfig struct {
	Host     string
	Port     string
	Password string
	DB       int
}

type KeycloakConfig struct {
	URL          string
	Realm        string
	ClientID     string
	ClientSecret string
	AdminUser    string
	AdminPassword string
}

type JWTConfig struct {
	Secret     string
	Expiration int // in seconds
}

type KafkaConfig struct {
	Brokers []string
	Topic   string
	GroupID string
}

func Load() *Config {
	// Load .env file if it exists
	_ = godotenv.Load()

	return &Config{
		Server: ServerConfig{
			Port: getEnv("USER_SERVER_PORT", ":8081"),
			Mode: getEnv("USER_SERVER_MODE", "debug"),
		},
		Database: DatabaseConfig{
			Host:     getEnv("USER_DATABASE_HOST", "localhost"),
			Port:     getEnv("USER_DATABASE_PORT", "5432"),
			User:     getEnv("USER_DATABASE_USER", "postgres"),
			Password: getEnv("USER_DATABASE_PASSWORD", "password"),
			DBName:   getEnv("USER_DATABASE_DBNAME", "realestate"),
			SSLMode:  getEnv("USER_DATABASE_SSLMODE", "disable"),
		},
		Redis: RedisConfig{
			Host:     getEnv("USER_REDIS_HOST", "localhost"),
			Port:     getEnv("USER_REDIS_PORT", "6379"),
			Password: getEnv("USER_REDIS_PASSWORD", ""),
			DB:       0,
		},
		Keycloak: KeycloakConfig{
			URL:          getEnv("KEYCLOAK_URL", "http://localhost:8080"),
			Realm:        getEnv("KEYCLOAK_REALM", "realestate"),
			ClientID:     getEnv("KEYCLOAK_CLIENT_ID", "user-service"),
			ClientSecret: getEnv("KEYCLOAK_CLIENT_SECRET", ""),
			AdminUser:    getEnv("KEYCLOAK_ADMIN_USER", "admin"),
			AdminPassword: getEnv("KEYCLOAK_ADMIN_PASSWORD", "admin"),
		},
		JWT: JWTConfig{
			Secret:     getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
			Expiration: 3600, // 1 hour
		},
		Kafka: KafkaConfig{
			Brokers: []string{getEnv("USER_KAFKA_BROKERS", "localhost:9092")},
			Topic:   getEnv("USER_KAFKA_TOPIC", "user-events"),
			GroupID: getEnv("USER_KAFKA_GROUPID", "user-service"),
		},
	}
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

func (c *Config) Validate() error {
	if c.Database.Host == "" {
		log.Fatal("DATABASE_HOST is required")
	}
	if c.JWT.Secret == "your-secret-key-change-in-production" {
		log.Println("WARNING: Using default JWT secret. Change in production!")
	}
	return nil
}

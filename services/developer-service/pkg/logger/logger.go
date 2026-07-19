package logger

import (
"os"

"github.com/sirupsen/logrus"
)

type Logger struct {
*logrus.Logger
}

func New() *Logger {
log := logrus.New()
log.SetOutput(os.Stdout)
log.SetFormatter(&logrus.JSONFormatter{})

level := os.Getenv("LOG_LEVEL")
if level == "" {
level = "info"
}

logLevel, err := logrus.ParseLevel(level)
if err != nil {
logLevel = logrus.InfoLevel
}
log.SetLevel(logLevel)

return &Logger{log}
}

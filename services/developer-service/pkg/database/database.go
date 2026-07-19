package database

import (
"fmt"
"os"

"github.com/realestate/developer-service/internal/model"
"gorm.io/driver/postgres"
"gorm.io/gorm"
)

func Connect() (*gorm.DB, error) {
dsn := fmt.Sprintf(
"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
os.Getenv("DB_HOST"),
os.Getenv("DB_PORT"),
os.Getenv("DB_USER"),
os.Getenv("DB_PASSWORD"),
os.Getenv("DB_NAME"),
)

db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
if err != nil {
return nil, err
}

return db, nil
}

func AutoMigrate(db *gorm.DB) error {
return db.AutoMigrate(
&model.Developer{},
&model.Project{},
&model.Unit{},
&model.Milestone{},
&model.Sale{},
)
}

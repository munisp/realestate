package repository

import (
"context"
"errors"
"time"

"github.com/google/uuid"
"github.com/realestate/developer-service/internal/model"
"gorm.io/gorm"
)

type DeveloperRepository interface {
Create(ctx context.Context, developer *model.Developer) error
GetByID(ctx context.Context, id uuid.UUID) (*model.Developer, error)
GetByEmail(ctx context.Context, email string) (*model.Developer, error)
List(ctx context.Context, filters map[string]interface{}, skip, limit int) ([]*model.Developer, int64, error)
Update(ctx context.Context, developer *model.Developer) error
Delete(ctx context.Context, id uuid.UUID) error
}

type developerRepository struct {
db *gorm.DB
}

func NewDeveloperRepository(db *gorm.DB) DeveloperRepository {
return &developerRepository{db: db}
}

func (r *developerRepository) Create(ctx context.Context, developer *model.Developer) error {
return r.db.WithContext(ctx).Create(developer).Error
}

func (r *developerRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Developer, error) {
var developer model.Developer
err := r.db.WithContext(ctx).First(&developer, "id = ?", id).Error
if err != nil {
if errors.Is(err, gorm.ErrRecordNotFound) {
return nil, errors.New("developer not found")
}
return nil, err
}
return &developer, nil
}

func (r *developerRepository) GetByEmail(ctx context.Context, email string) (*model.Developer, error) {
var developer model.Developer
err := r.db.WithContext(ctx).First(&developer, "email = ?", email).Error
if err != nil {
if errors.Is(err, gorm.ErrRecordNotFound) {
return nil, errors.New("developer not found")
}
return nil, err
}
return &developer, nil
}

func (r *developerRepository) List(ctx context.Context, filters map[string]interface{}, skip, limit int) ([]*model.Developer, int64, error) {
var developers []*model.Developer
var total int64

query := r.db.WithContext(ctx).Model(&model.Developer{})

for key, value := range filters {
query = query.Where(key+" = ?", value)
}

if err := query.Count(&total).Error; err != nil {
return nil, 0, err
}

if err := query.Offset(skip).Limit(limit).Find(&developers).Error; err != nil {
return nil, 0, err
}

return developers, total, nil
}

func (r *developerRepository) Update(ctx context.Context, developer *model.Developer) error {
developer.UpdatedAt = time.Now()
return r.db.WithContext(ctx).Save(developer).Error
}

func (r *developerRepository) Delete(ctx context.Context, id uuid.UUID) error {
return r.db.WithContext(ctx).Delete(&model.Developer{}, "id = ?", id).Error
}

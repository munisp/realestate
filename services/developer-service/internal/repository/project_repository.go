package repository

import (
"context"
"errors"
"time"

"github.com/google/uuid"
"github.com/realestate/developer-service/internal/model"
"gorm.io/gorm"
)

type ProjectRepository interface {
Create(ctx context.Context, project *model.Project) error
GetByID(ctx context.Context, id uuid.UUID) (*model.Project, error)
GetByDeveloperID(ctx context.Context, developerID uuid.UUID, skip, limit int) ([]*model.Project, int64, error)
List(ctx context.Context, filters map[string]interface{}, skip, limit int) ([]*model.Project, int64, error)
Update(ctx context.Context, project *model.Project) error
UpdateUnitCounts(ctx context.Context, projectID uuid.UUID) error
Delete(ctx context.Context, id uuid.UUID) error
}

type projectRepository struct {
db *gorm.DB
}

func NewProjectRepository(db *gorm.DB) ProjectRepository {
return &projectRepository{db: db}
}

func (r *projectRepository) Create(ctx context.Context, project *model.Project) error {
return r.db.WithContext(ctx).Create(project).Error
}

func (r *projectRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Project, error) {
var project model.Project
err := r.db.WithContext(ctx).Preload("Developer").First(&project, "id = ?", id).Error
if err != nil {
if errors.Is(err, gorm.ErrRecordNotFound) {
return nil, errors.New("project not found")
}
return nil, err
}
return &project, nil
}

func (r *projectRepository) GetByDeveloperID(ctx context.Context, developerID uuid.UUID, skip, limit int) ([]*model.Project, int64, error) {
var projects []*model.Project
var total int64

query := r.db.WithContext(ctx).Model(&model.Project{}).Where("developer_id = ?", developerID)

if err := query.Count(&total).Error; err != nil {
return nil, 0, err
}

if err := query.Offset(skip).Limit(limit).Find(&projects).Error; err != nil {
return nil, 0, err
}

return projects, total, nil
}

func (r *projectRepository) List(ctx context.Context, filters map[string]interface{}, skip, limit int) ([]*model.Project, int64, error) {
var projects []*model.Project
var total int64

query := r.db.WithContext(ctx).Model(&model.Project{}).Preload("Developer")

for key, value := range filters {
query = query.Where(key+" = ?", value)
}

if err := query.Count(&total).Error; err != nil {
return nil, 0, err
}

if err := query.Offset(skip).Limit(limit).Find(&projects).Error; err != nil {
return nil, 0, err
}

return projects, total, nil
}

func (r *projectRepository) Update(ctx context.Context, project *model.Project) error {
project.UpdatedAt = time.Now()
return r.db.WithContext(ctx).Save(project).Error
}

func (r *projectRepository) UpdateUnitCounts(ctx context.Context, projectID uuid.UUID) error {
var counts struct {
Total     int64
Available int64
Sold      int64
Reserved  int64
}

if err := r.db.WithContext(ctx).Model(&model.Unit{}).
Where("project_id = ?", projectID).
Count(&counts.Total).Error; err != nil {
return err
}

if err := r.db.WithContext(ctx).Model(&model.Unit{}).
Where("project_id = ? AND status = ?", projectID, "available").
Count(&counts.Available).Error; err != nil {
return err
}

if err := r.db.WithContext(ctx).Model(&model.Unit{}).
Where("project_id = ? AND status = ?", projectID, "sold").
Count(&counts.Sold).Error; err != nil {
return err
}

if err := r.db.WithContext(ctx).Model(&model.Unit{}).
Where("project_id = ? AND status = ?", projectID, "reserved").
Count(&counts.Reserved).Error; err != nil {
return err
}

return r.db.WithContext(ctx).Model(&model.Project{}).
Where("id = ?", projectID).
Updates(map[string]interface{}{
"total_units":     counts.Total,
"available_units": counts.Available,
"sold_units":      counts.Sold,
"reserved_units":  counts.Reserved,
}).Error
}

func (r *projectRepository) Delete(ctx context.Context, id uuid.UUID) error {
return r.db.WithContext(ctx).Delete(&model.Project{}, "id = ?", id).Error
}

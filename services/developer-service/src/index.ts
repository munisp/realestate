import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());

interface Developer {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  projects: Project[];
  verified: boolean;
  rating: number;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  location: string;
  totalUnits: number;
  soldUnits: number;
  priceRange: { min: number; max: number };
  status: 'PLANNING' | 'CONSTRUCTION' | 'COMPLETED';
  completionDate?: string;
}

class DeveloperService {
  private developers = new Map<string, Developer>();

  create(data: Omit<Developer, 'id' | 'projects' | 'verified' | 'rating' | 'createdAt'>) {
    const developer: Developer = {
      ...data,
      id: uuidv4(),
      projects: [],
      verified: false,
      rating: 0,
      createdAt: new Date().toISOString()
    };
    this.developers.set(developer.id, developer);
    return developer;
  }

  get(id: string) {
    return this.developers.get(id);
  }

  list() {
    return Array.from(this.developers.values());
  }

  addProject(developerId: string, project: Omit<Project, 'id'>) {
    const developer = this.developers.get(developerId);
    if (!developer) throw new Error('Developer not found');
    const newProject: Project = { ...project, id: uuidv4() };
    developer.projects.push(newProject);
    this.developers.set(developerId, developer);
    return newProject;
  }

  verify(id: string) {
    const developer = this.developers.get(id);
    if (!developer) throw new Error('Developer not found');
    developer.verified = true;
    this.developers.set(id, developer);
    return developer;
  }
}

const service = new DeveloperService();

app.post('/developers', (req, res) => {
  try {
    const dev = service.create(req.body);
    res.status(201).json(dev);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/developers/:id', (req, res) => {
  const dev = service.get(req.params.id);
  if (!dev) return res.status(404).json({ error: 'Not found' });
  res.json(dev);
});

app.get('/developers', (req, res) => {
  res.json(service.list());
});

app.post('/developers/:id/projects', (req, res) => {
  try {
    const project = service.addProject(req.params.id, req.body);
    res.status(201).json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/developers/:id/verify', (req, res) => {
  try {
    const dev = service.verify(req.params.id);
    res.json(dev);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'developer' }));

app.listen(process.env.PORT || 5113, () => console.log('Developer service running'));

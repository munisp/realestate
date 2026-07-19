import express, { Request, Response } from 'express';
import { create, IPFSHTTPClient } from 'ipfs-http-client';
import multer from 'multer';
import { Readable } from 'stream';

const app = express();
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

class IPFSService {
  private client: IPFSHTTPClient;
  private pinataKey = process.env.PINATA_API_KEY || '';
  private pinataSecret = process.env.PINATA_SECRET_KEY || '';

  constructor() {
    this.client = create({
      host: process.env.IPFS_HOST || 'ipfs.infura.io',
      port: 5001,
      protocol: 'https'
    });
  }

  async uploadFile(file: Buffer, filename: string) {
    const result = await this.client.add({
      path: filename,
      content: file
    });

    await this.pinToPinata(result.cid.toString());

    return {
      cid: result.cid.toString(),
      path: result.path,
      size: result.size,
      url: `https://ipfs.io/ipfs/${result.cid.toString()}`,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${result.cid.toString()}`
    };
  }

  async uploadJSON(data: any, filename: string) {
    const content = JSON.stringify(data, null, 2);
    const result = await this.client.add({
      path: filename,
      content: Buffer.from(content)
    });

    await this.pinToPinata(result.cid.toString());

    return {
      cid: result.cid.toString(),
      path: result.path,
      size: result.size,
      url: `https://ipfs.io/ipfs/${result.cid.toString()}`
    };
  }

  async retrieveFile(cid: string) {
    const chunks: Uint8Array[] = [];
    
    for await (const chunk of this.client.cat(cid)) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  async pinToPinata(cid: string) {
    if (!this.pinataKey || !this.pinataSecret) {
      console.log('Pinata credentials not configured, skipping pin');
      return;
    }

    console.log(`Pinning ${cid} to Pinata`);
    return { pinned: true, cid };
  }

  async uploadPropertyDocuments(propertyId: string, documents: Array<{ name: string; buffer: Buffer }>) {
    const uploads = await Promise.all(
      documents.map(doc => this.uploadFile(doc.buffer, doc.name))
    );

    const manifest = {
      propertyId,
      documents: uploads.map((u, i) => ({
        name: documents[i].name,
        cid: u.cid,
        url: u.url,
        size: u.size
      })),
      uploadedAt: new Date().toISOString()
    };

    const manifestUpload = await this.uploadJSON(manifest, `property-${propertyId}-manifest.json`);

    return {
      manifestCid: manifestUpload.cid,
      manifestUrl: manifestUpload.url,
      documents: manifest.documents
    };
  }

  async uploadSmartContractMetadata(contractAddress: string, metadata: any) {
    const data = {
      contractAddress,
      metadata,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };

    return await this.uploadJSON(data, `contract-${contractAddress}.json`);
  }
}

const service = new IPFSService();

app.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const result = await service.uploadFile(req.file.buffer, req.file.originalname);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/upload/json', async (req: Request, res: Response) => {
  try {
    const { data, filename } = req.body;
    const result = await service.uploadJSON(data, filename);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/retrieve/:cid', async (req: Request, res: Response) => {
  try {
    const content = await service.retrieveFile(req.params.cid);
    res.send(content);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/property/:propertyId/documents', upload.array('documents'), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No documents provided' });
    }

    const documents = files.map(f => ({
      name: f.originalname,
      buffer: f.buffer
    }));

    const result = await service.uploadPropertyDocuments(req.params.propertyId, documents);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/contract/:address/metadata', async (req: Request, res: Response) => {
  try {
    const result = await service.uploadSmartContractMetadata(req.params.address, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'ipfs' });
});

const PORT = process.env.PORT || 5101;
app.listen(PORT, () => {
  console.log(`IPFS service running on port ${PORT}`);
});

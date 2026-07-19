import torch
import os
from functools import lru_cache

class GPUOptimizer:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.batch_size = int(os.getenv("DEEPSEEK_OCR_BATCH_SIZE", "8"))
        
        # Enable TF32 for better performance on Ampere GPUs
        if torch.cuda.is_available():
            torch.backends.cuda.matmul.allow_tf32 = True
            torch.backends.cudnn.allow_tf32 = True
            torch.backends.cudnn.benchmark = True
            
    @lru_cache(maxsize=100)
    def get_model(self, model_name: str):
        """Cache loaded models to avoid reloading"""
        # Model loading logic here
        pass
        
    def batch_process_images(self, images: list, process_func):
        """Process images in batches for GPU efficiency"""
        results = []
        for i in range(0, len(images), self.batch_size):
            batch = images[i:i + self.batch_size]
            batch_results = process_func(batch)
            results.extend(batch_results)
        return results
        
    def optimize_image_tensor(self, image_tensor):
        """Optimize image tensor for GPU processing"""
        if torch.cuda.is_available():
            return image_tensor.to(self.device).half()  # Use FP16 for faster inference
        return image_tensor
        
    def get_gpu_stats(self):
        """Get current GPU utilization stats"""
        if not torch.cuda.is_available():
            return {}
            
        return {
            "gpu_count": torch.cuda.device_count(),
            "current_device": torch.cuda.current_device(),
            "device_name": torch.cuda.get_device_name(0),
            "memory_allocated": torch.cuda.memory_allocated(0) / 1024**3,  # GB
            "memory_reserved": torch.cuda.memory_reserved(0) / 1024**3,  # GB
            "memory_total": torch.cuda.get_device_properties(0).total_memory / 1024**3  # GB
        }

# Global optimizer instance
gpu_optimizer = GPUOptimizer()

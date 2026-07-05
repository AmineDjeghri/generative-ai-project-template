import pytest
import torch

from genai_template_backend.backend_settings import logger


@pytest.mark.skipif(not torch.cuda.is_available(), reason="CUDA is not available")
def test_cuda_functionality():
    """Tests if CUDA is actually functional, not just available."""
    tensor = torch.tensor([1.0]).cuda().cpu()
    assert tensor is not None
    logger.debug("CUDA functionality test passed")

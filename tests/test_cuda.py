import pytest
import torch

from genai_template_backend.env_settings import logger


@pytest.mark.skipif(not torch.cuda.is_available(), reason="CUDA is not available")
def test_cuda_functionality():
    """Tests if CUDA is actually functional, not just available."""
    try:
        test_tensor = torch.tensor([1.0])
        test_tensor = test_tensor.cuda()
        test_tensor = test_tensor.cpu()
        assert True
    except Exception as e:
        logger.warning(f"CUDA functionality test failed: {e}")
        assert False

import pytest

from genai_template_backend.backend_settings import logger


pytestmark = pytest.mark.hardware


def test_cuda_functionality():
    """Tests if CUDA is actually functional, not just available."""
    try:
        import torch
    except ImportError:
        pytest.fail("Install optional CUDA PyTorch with make install-dev-cuda", pytrace=False)
    if not torch.cuda.is_available():
        pytest.fail("The explicitly requested CUDA check requires a CUDA device")
    tensor = torch.tensor([1.0]).cuda().cpu()
    assert tensor is not None
    logger.debug("CUDA functionality test passed")

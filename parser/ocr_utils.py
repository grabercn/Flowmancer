import logging
import numpy as np
from PIL import Image
from paddleocr import PaddleOCR, exceptions as PaddleExceptions

logger = logging.getLogger(__name__)

# Initialize PaddleOCR. This should ideally be done once.
# langs can be 'en' for English. Add 'ch' for Chinese, etc.
# Consider making this configurable or initializing it globally in your app if used frequently.
OCR_ENGINE = None

def initialize_ocr(lang_list='en'):
    global OCR_ENGINE
    if OCR_ENGINE is None:
        try:
            logger.info(f"Initializing PaddleOCR engine with languages: {lang_list}...")
            OCR_ENGINE = PaddleOCR(use_angle_cls=True, lang=lang_list, show_log=False)
            logger.info("PaddleOCR engine initialized successfully.")
        except PaddleExceptions.PaddleCRError as pe:
            logger.error(f"PaddleOCR C++ components error: {pe}. Ensure PaddlePaddle is installed correctly for your CPU/GPU environment.", exc_info=True)
            raise
        except Exception as e:
            logger.error(f"Failed to initialize PaddleOCR engine: {e}", exc_info=True)
            # Depending on your application's needs, you might want to raise the exception
            # or allow the application to continue with OCR functionality disabled.
            raise # For now, let's make it critical if OCR fails to init

# Call initialization at module load, or lazily when ocr_read is first called.
# For a FastAPI app, it's better to initialize it during startup event.
# For now, we'll try to initialize it here, but lazy init in ocr_read is safer for some environments.

def ocr_read(image_crop_pil: Image.Image) -> str:
    """
    Performs OCR on a given PIL Image crop using PaddleOCR.

    Args:
        image_crop_pil: A PIL.Image object of the cropped region.

    Returns:
        A string containing the cleaned-up text found in the image crop.
    """
    global OCR_ENGINE
    if OCR_ENGINE is None:
        # Lazy initialization if not already done (e.g. if used outside FastAPI startup)
        try:
            initialize_ocr()
            if OCR_ENGINE is None: # Still None after attempt
                 logger.error("OCR Engine could not be initialized. OCR will not function.")
                 return ""
        except Exception as e:
            logger.error(f"Lazy OCR initialization failed: {e}")
            return ""


    if image_crop_pil is None:
        logger.warning("ocr_read received a None image crop.")
        return ""

    try:
        # Convert PIL Image to NumPy array, which PaddleOCR expects
        img_np = np.array(image_crop_pil)
        
        result = OCR_ENGINE.ocr(img_np, cls=True)
        
        ocr_text = ""
        if result and result[0] is not None: # Check if result[0] is not None
            texts = [line[1][0] for line in result[0] if line and len(line) > 1 and len(line[1]) > 0]
            ocr_text = " ".join(texts).strip()
            logger.debug(f"OCR raw result: {result}, Extracted text: '{ocr_text}'")
        else:
            logger.debug("OCR returned no results or an empty first element.")
        return clean_text(ocr_text)
        
    except AttributeError as ae: # Catch if OCR_ENGINE is None despite checks (shouldn't happen with lazy init)
        logger.error(f"OCR engine not available or attribute error: {ae}", exc_info=True)
        return ""
    except Exception as e:
        logger.error(f"Error during OCR processing: {e}", exc_info=True)
        return ""

def clean_text(text: str) -> str:
    # Basic cleaning, can be expanded (e.g., remove special characters, correct common OCR mistakes)
    return text.strip().replace("\n", " ").replace("  ", " ")

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    # To test this, you'd need a sample image crop.
    # Create a dummy white image with black text for a simple test.
    try:
        from PIL import Image, ImageDraw, ImageFont
        
        # Attempt to initialize OCR directly for the test
        initialize_ocr()
        if OCR_ENGINE:
            # Create a sample image for testing
            width, height = 200, 50
            test_img = Image.new('RGB', (width, height), color='white')
            draw = ImageDraw.Draw(test_img)
            try:
                # Use a common font; adjust path if necessary or use a default
                font = ImageFont.truetype("arial.ttf", 20)
            except IOError:
                font = ImageFont.load_default()
            
            draw.text((10, 10), "Hello: OCR", fill='black', font=font)
            test_img.save("test_ocr_sample.png")
            logger.info("Created test_ocr_sample.png")

            text_from_ocr = ocr_read(test_img)
            logger.info(f"OCR test result for 'Hello: OCR': '{text_from_ocr}' (Expected: 'Hello: OCR')")

            empty_img = Image.new('RGB', (width,height), color='white')
            text_from_empty_ocr = ocr_read(empty_img)
            logger.info(f"OCR test result for empty image: '{text_from_empty_ocr}' (Expected: '')")
        else:
            logger.error("OCR Engine could not be initialized for the standalone test.")

    except ImportError:
        logger.warning("Pillow (PIL) or other dependencies not found for standalone OCR test.")
    except Exception as e:
        logger.error(f"Error in OCR standalone test: {e}")
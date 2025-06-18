import logging
import yaml # For reading yolov8_config.yaml
from typing import List, Dict, Any, Tuple, Optional
from pathlib import Path
from PIL import Image, ImageDraw, UnidentifiedImageError
import cv2 # OpenCV for image pre-processing if needed, or drawing
import numpy as np

from ultralytics import YOLO # type: ignore # For YOLOv8 inference
from .ocr_utils import ocr_read, initialize_ocr as initialize_parser_ocr # Use our actual OCR

logger = logging.getLogger(__name__)

YOLO_MODEL: Optional[YOLO] = None
MODEL_CONFIG: Dict[str, Any] = {}

def load_yolo_model_and_config(config_file: str = "parser/yolov8_config.yaml") -> None:
    global YOLO_MODEL, MODEL_CONFIG
    if YOLO_MODEL is not None:
        logger.info("YOLOv8 model and config already loaded.")
        return

    try:
        config_path = Path(__file__).resolve().parent / config_file
        if not config_path.exists():
            logger.error(f"YOLOv8 config file not found at: {config_path}")
            raise FileNotFoundError(f"YOLOv8 config file not found: {config_path}")

        with open(config_path, 'r') as f:
            MODEL_CONFIG = yaml.safe_load(f)

        model_weights_path_str = MODEL_CONFIG.get("model_weights_path")
        if not model_weights_path_str:
            logger.error("`model_weights_path` not specified in yolov8_config.yaml.")
            raise ValueError("Model weights path not specified in config.")

        model_weights_path = Path(model_weights_path_str)
        if not model_weights_path.is_file():
            # Try resolving relative to config file or project root if not absolute
            model_weights_path = (Path(__file__).resolve().parent / model_weights_path_str).resolve()
            if not model_weights_path.is_file():
                 model_weights_path = (Path(__file__).resolve().parent.parent / model_weights_path_str).resolve() # project root
                 if not model_weights_path.is_file():
                    logger.error(f"YOLOv8 model weights file not found at: {model_weights_path_str} (also checked relative paths)")
                    raise FileNotFoundError(f"YOLOv8 model weights not found: {model_weights_path}")
        
        logger.info(f"Loading YOLOv8 model from: {model_weights_path}")
        YOLO_MODEL = YOLO(str(model_weights_path))
        logger.info("YOLOv8 model loaded successfully.")

        # Initialize OCR as well when parser components are loaded
        initialize_parser_ocr()

    except FileNotFoundError:
        raise # Reraise specific error
    except Exception as e:
        logger.error(f"Error loading YOLOv8 model or config: {e}", exc_info=True)
        YOLO_MODEL = None # Ensure model is None if loading failed
        raise # Reraise to prevent app from starting with a broken parser

def run_yolo_inference(image_pil: Image.Image) -> List[Dict[str, Any]]:
    global YOLO_MODEL, MODEL_CONFIG
    if YOLO_MODEL is None:
        logger.error("YOLO_MODEL is not loaded. Cannot run inference.")
        # Attempt to load it now (could be part of lazy loading strategy)
        # load_yolo_model_and_config()
        # if YOLO_MODEL is None: # Still not loaded
        raise RuntimeError("YOLO model not loaded. Inference cannot proceed.")

    detections = []
    try:
        # Perform detection
        # Convert PIL image to a format YOLO might prefer (e.g., OpenCV BGR numpy array)
        # Or pass PIL image directly if supported by current ultralytics version.
        # results = YOLO_MODEL(image_pil) # Ultralytics YOLO often accepts PIL images
        results = YOLO_MODEL.predict(
            source=image_pil, 
            conf=MODEL_CONFIG.get('confidence_threshold', 0.35),
            iou=MODEL_CONFIG.get('iou_threshold', 0.45)
        )
        
        trained_class_names = MODEL_CONFIG.get('class_names', {})

        for result in results: # Iterates over results for each image (though we send one)
            for box in result.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist()) # Ensure integer coordinates
                class_id = int(box.cls[0])
                label = trained_class_names.get(class_id, f"unknown_class_{class_id}")
                confidence = float(box.conf[0])
                
                detections.append({
                    "box": [x1, y1, x2, y2],  # [x_min, y_min, x_max, y_max]
                    "label": label,
                    "confidence": confidence
                })
        logger.info(f"YOLO inference found {len(detections)} objects.")
    except Exception as e:
        logger.error(f"Error during YOLOv8 inference: {e}", exc_info=True)
    return detections


def parse_attribute_text(text: str) -> Dict[str, Any]:
    text = text.strip()
    name = ""
    attr_type = "String"  # Default type
    is_pk = False
    is_fk = False

    # Heuristic: if "(PK)" or similar is found, it's likely a primary key.
    pk_markers = ["(PK)", "PK", "PRIMARY KEY"]
    fk_markers = ["(FK)", "FK", "FOREIGN KEY"]

    # Remove PK/FK markers for easier type parsing
    original_text_for_type = text
    for marker in pk_markers:
        if marker in text.upper():
            is_pk = True
            original_text_for_type = original_text_for_type.upper().replace(marker, "").strip()
    for marker in fk_markers:
        if marker in text.upper(): # An attribute can be both PK and FK
            is_fk = True
            original_text_for_type = original_text_for_type.upper().replace(marker, "").strip()
            
    parts = original_text_for_type.split(':')
    if len(parts) > 0:
        name_candidate = parts[0].strip()
        # Remove any lingering PK/FK from name if they were part of it
        for marker in pk_markers + fk_markers:
            name_candidate = name_candidate.upper().replace(marker, "").strip()
        name = name_candidate

    if len(parts) > 1:
        type_details = parts[1].strip()
        # Simple type mapping (expand as needed)
        type_details_lower = type_details.lower()
        if any(t in type_details_lower for t in ["long", "int", "integer", "serial", "number"]):
            attr_type = "Long"
        elif any(t in type_details_lower for t in ["string", "varchar", "text", "char"]):
            attr_type = "String"
        elif "date" in type_details_lower or "timestamp" in type_details_lower:
            attr_type = "Date" # Or "Timestamp" / "DateTime"
        elif "bool" in type_details_lower or "boolean" in type_details_lower:
            attr_type = "Boolean"
        elif "decimal" in type_details_lower or "numeric" in type_details_lower or "double" in type_details_lower or "float" in type_details_lower:
            attr_type = "Double" # Or "Decimal" / "Float"
        else:
            # If no clear match, take the first word as type
            attr_type = type_details.split(" ")[0].strip().capitalize() if type_details else "String"
            if not attr_type: attr_type = "String" # fallback
    
    # Further PK heuristic: if 'id' is in name (and not already marked FK)
    if not is_pk and ("id" == name.lower() or name.lower().endswith("_id")) and not is_fk:
        if name.lower() == "id": # Typically only "id" itself, not "user_id" unless it's the PK of current table
            is_pk = True
    
    # Ensure name is not empty
    if not name and text: # If name parsing failed but there was text
        name = text.split(" ")[0].strip() # Fallback to first word
        if not name : name = "attribute" # Ultimate fallback

    return {"name": name, "type": attr_type, "pk": is_pk, "fk": is_fk}

def crop_image_from_box(image_pil: Image.Image, box: List[int]) -> Optional[Image.Image]:
    try:
        # Ensure box coordinates are within image bounds
        img_width, img_height = image_pil.size
        x1, y1, x2, y2 = box
        x1 = max(0, x1)
        y1 = max(0, y1)
        x2 = min(img_width, x2)
        y2 = min(img_height, y2)
        if x1 >= x2 or y1 >= y2: # Invalid box
            logger.warning(f"Invalid crop box {box} after clamping for image size {image_pil.size}.")
            return None
        return image_pil.crop((x1, y1, x2, y2))
    except Exception as e:
        logger.error(f"Error cropping image with box {box}: {e}", exc_info=True)
        return None

def get_box_center(box: List[int]) -> Tuple[float, float]:
    return (box[0] + box[2]) / 2.0, (box[1] + box[3]) / 2.0

def distance_sq(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    return (p1[0] - p2[0])**2 + (p1[1] - p2[1])**2

def is_point_near_line_segment(px, py, x1, y1, x2, y2, threshold_dist_sq):
    """Check if a point is near a line segment."""
    # Line segment length squared
    len_sq = (x2 - x1)**2 + (y2 - y1)**2
    if len_sq == 0:  # Line is a point
        return (px - x1)**2 + (py - y1)**2 <= threshold_dist_sq
    
    # Parameter t for projection of point P onto the line containing segment AB
    # t = [(P - A) . (B - A)] / |B - A|^2
    t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / len_sq
    
    if t < 0:  # Projection is outside segment, beyond A
        closest_x, closest_y = x1, y1
    elif t > 1:  # Projection is outside segment, beyond B
        closest_x, closest_y = x2, y2
    else:  # Projection is on the segment
        closest_x = x1 + t * (x2 - x1)
        closest_y = y1 + t * (y2 - y1)
        
    # Distance from P to closest point on segment
    dist_to_segment_sq = (px - closest_x)**2 + (py - closest_y)**2
    return dist_to_segment_sq <= threshold_dist_sq


def parse_image_to_schema(image_path: str) -> Dict[str, List[Dict[str, Any]]]:
    global YOLO_MODEL
    if YOLO_MODEL is None: # Ensure model is loaded
        logger.warning("YOLO model was not pre-loaded. Attempting to load now for parse_image_to_schema.")
        load_yolo_model_and_config() # This will raise error if it fails
        if YOLO_MODEL is None:
             raise RuntimeError("YOLO model failed to load. Cannot parse image.")


    try:
        image_pil = Image.open(image_path).convert("RGB") # Ensure RGB
    except FileNotFoundError:
        logger.error(f"Image not found at {image_path}")
        raise
    except UnidentifiedImageError:
        logger.error(f"Cannot identify image file (possibly corrupt or unsupported format): {image_path}")
        raise
    except Exception as e:
        logger.error(f"Error opening image {image_path}: {e}", exc_info=True)
        raise

    detections = run_yolo_inference(image_pil)
    if not detections:
        logger.warning(f"No objects detected by YOLO in image {image_path}.")
        return {"entities": [], "relationships": []} # Return empty schema

    # --- Store detected components ---
    entities_detected = []      # {name_text, name_ocr, box, attributes_raw: [ {text, box} ] }
    attributes_detected = []    # {text_ocr, box}
    relationships_detected = [] # {box} (lines)
    cardinalities_detected = [] # {text_ocr, box}

    for det in detections:
        cropped_pil = crop_image_from_box(image_pil, det["box"])
        if not cropped_pil:
            logger.warning(f"Could not crop for detection: {det}")
            continue
        
        ocr_text = ocr_read(cropped_pil)
        logger.debug(f"Label: {det['label']}, Box: {det['box']}, OCR: '{ocr_text}'")

        if det["label"] == "entity_rect":
            entities_detected.append({"name_text": ocr_text, "box": det["box"], "attributes_raw": []})
        elif det["label"] == "attribute_rect":
            attributes_detected.append({"text_ocr": ocr_text, "box": det["box"]})
        elif det["label"] == "relationship_line":
            relationships_detected.append({"box": det["box"]})
        elif det["label"] == "cardinality_label": # If model detects these
            cardinalities_detected.append({"text_ocr": ocr_text, "box": det["box"]})
        # else:
        #     logger.info(f"Ignoring unknown YOLO label: {det['label']}")


    # --- Build Schema: Phase 1 - Entities and their Attributes ---
    final_entities_map = {} # name -> {name, attributes_parsed, box}

    for entity_info in entities_detected:
        entity_name = entity_info["name_text"]
        if not entity_name:
            logger.warning(f"Skipping entity with no OCR name: box {entity_info['box']}")
            continue
        
        entity_name = entity_name.replace("\n", " ").strip().capitalize() # Basic cleaning
        if not entity_name: continue # Skip if empty after cleaning

        current_entity_attributes = []
        # Associate attributes geometrically
        entity_box = entity_info["box"]
        for attr_info in attributes_detected:
            attr_box = attr_info["box"]
            # Simple containment or strong overlap might indicate an attribute belongs to an entity
            # More sophisticated: check if attribute center is within entity, or if attr box is close to entity border
            attr_center_x = (attr_box[0] + attr_box[2]) / 2
            attr_center_y = (attr_box[1] + attr_box[3]) / 2

            # Check if attribute center is inside the entity box
            if (entity_box[0] < attr_center_x < entity_box[2] and
                entity_box[1] < attr_center_y < entity_box[3]):
                
                parsed_attr = parse_attribute_text(attr_info["text_ocr"])
                if parsed_attr["name"]: # Only add if name could be parsed
                    current_entity_attributes.append(parsed_attr)
                else:
                    logger.warning(f"Attribute text '{attr_info['text_ocr']}' for entity '{entity_name}' could not be meaningfully parsed.")
            
        final_entities_map[entity_name] = {
            "name": entity_name,
            "attributes": current_entity_attributes,
            "box": entity_box # Keep box for relationship processing
        }
    
    # --- Build Schema: Phase 2 - Relationships ---
    # This part is complex and requires robust geometric reasoning
    final_relationships = []
    MAX_DIST_CARDINALITY_TO_LINE_END_SQ = (50*50) # Max distance (squared) for cardinality to line end (pixels)
                                                # This threshold needs tuning based on image resolution & diagram style
    
    # Create a list of entity centers for quick lookup
    entity_centers = {name: get_box_center(data["box"]) for name, data in final_entities_map.items()}

    for rel_line in relationships_detected:
        line_box = rel_line["box"] # This might be a thin bounding box around the line
        # For simplicity, let's use the line's conceptual start/end points.
        # If the line_box is very thin, its corners can approximate the line.
        # A better way: skeletonize the line mask or use Hough transform from YOLO mask output if available.
        # For now, assume line_box[0],line_box[1] and line_box[2],line_box[3] are "ends" if horizontal/vertical
        # or use center of short edges.
        # For this example, let's take the two extreme points of the line_box as potential ends.
        # This is a major simplification.
        
        # Assuming the line_box itself represents the line's span
        line_pt1 = (line_box[0], line_box[1] + (line_box[3] - line_box[1])/2 ) # Mid-left
        line_pt2 = (line_box[2], line_box[1] + (line_box[3] - line_box[1])/2 ) # Mid-right
        # Or, if a diagonal line, its actual endpoints are needed from the YOLO detection if it provides them.
        # If not, this part is very hard with just a bounding box for a line.

        # Find entities closest to the (simplified) line endpoints
        connected_entities_info = [] # Stores (entity_name, distance_to_endpoint_sq, endpoint_coord)

        for name, center_coord in entity_centers.items():
            dist1_sq = distance_sq(center_coord, line_pt1)
            dist2_sq = distance_sq(center_coord, line_pt2)
            
            # Heuristic: an entity is connected if its center is "close enough" to an endpoint
            # This threshold needs tuning.
            connection_threshold_sq = (100*100) # e.g., 100 pixels
            if dist1_sq < connection_threshold_sq:
                connected_entities_info.append({"name": name, "dist_sq": dist1_sq, "line_end_coord": line_pt1, "is_end1": True})
            if dist2_sq < connection_threshold_sq:
                connected_entities_info.append({"name": name, "dist_sq": dist2_sq, "line_end_coord": line_pt2, "is_end1": False})

        # Sort by distance to find the two distinct closest entities
        connected_entities_info.sort(key=lambda x: x["dist_sq"])
        
        # Deduplicate and get the two best candidates for a relationship
        unique_connected_names = []
        final_pair = []
        for info in connected_entities_info:
            if info["name"] not in unique_connected_names:
                unique_connected_names.append(info["name"])
                final_pair.append(info)
            if len(unique_connected_names) == 2:
                break
        
        if len(final_pair) == 2:
            entity1_info = final_pair[0]
            entity2_info = final_pair[1]
            
            # Ensure they are associated with different ends of the conceptual line, if possible.
            # This logic needs to be much smarter with actual line geometry.
            # For now, assume entity1_info is 'from' and entity2_info is 'to'
            from_entity_name = entity1_info["name"]
            to_entity_name = entity2_info["name"]
            
            # OCR Cardinalities near these assumed line ends
            card1_text, card2_text = "1", "N" # Defaults
            
            # Find cardinality labels near the line ends that are connected to these entities
            line_end1_coord = entity1_info["line_end_coord"] # The line end entity1 is supposedly connected to
            line_end2_coord = entity2_info["line_end_coord"] # The line end entity2 is supposedly connected to

            # Search for cardinalities near these specific points
            for card_info in cardinalities_detected:
                card_center = get_box_center(card_info["box"])
                if distance_sq(card_center, line_end1_coord) < MAX_DIST_CARDINALITY_TO_LINE_END_SQ:
                    card1_text = card_info["text_ocr"] if card_info["text_ocr"] else card1_text
                elif distance_sq(card_center, line_end2_coord) < MAX_DIST_CARDINALITY_TO_LINE_END_SQ:
                    card2_text = card_info["text_ocr"] if card_info["text_ocr"] else card2_text
            
            # Normalize common cardinality notations
            # This is very basic, expand significantly.
            card1_text = "N" if card1_text.lower() in ["n", "m", "*", "many"] else "1" if card1_text == "1" else card1_text
            card2_text = "N" if card2_text.lower() in ["n", "m", "*", "many"] else "1" if card2_text == "1" else card2_text

            # Determine foreign key (simplistic: N side usually has it)
            # This part often requires looking at attribute names like 'entityname_id'
            fk_name = f"{from_entity_name.lower()}_id" # Common convention
            if card2_text == "1" and card1_text == "N": # if 'to' side is 1 and 'from' side is N
                fk_name = f"{to_entity_name.lower()}_id"


            final_relationships.append({
                "from": from_entity_name,
                "to": to_entity_name,
                "type": f"{card1_text}:{card2_text}", # e.g., 1:N
                "key": fk_name # Placeholder, actual FK detection is harder
            })
        else:
            logger.warning(f"Could not confidently determine two distinct entities for relationship line at {line_box}")


    # Final schema structure
    output_schema = {
        "entities": [data for data in final_entities_map.values()],
        "relationships": final_relationships
    }
    
    logger.info(f"Schema parsing complete. Entities: {len(output_schema['entities'])}, Relationships: {len(output_schema['relationships'])}")
    return output_schema


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO) # Set to DEBUG for more verbose output from parser
    
    # This needs to be called to load model and config before parsing
    # In a FastAPI app, this would happen in the startup event.
    try:
        load_yolo_model_and_config() # Will use parser/yolov8_config.yaml by default
    except Exception as e:
        logger.error(f"Failed to initialize models for standalone test: {e}", exc_info=True)
        exit(1)

    # Ensure you have a sample image in the samples directory
    sample_image_file = Path(__file__).resolve().parent.parent / "samples" / "sample_er_diagram.png"

    if not sample_image_file.exists():
        logger.error(f"Sample image {sample_image_file} not found. Please create it or update the path.")
    elif YOLO_MODEL is None: # Check if model loaded successfully
        logger.error("YOLO Model is not loaded. Cannot proceed with parsing example.")
    else:
        logger.info(f"Attempting to parse: {sample_image_file}")
        try:
            schema = parse_image_to_schema(str(sample_image_file))
            print("\n--- Generated Schema ---")
            print(json.dumps(schema, indent=2)) # type: ignore

            # Optional: Save an image with detected boxes drawn (for debugging)
            # image_pil_for_drawing = Image.open(sample_image_file).convert("RGB")
            # detections_for_drawing = run_yolo_inference(image_pil_for_drawing.copy()) # Rerun inference or store results
            # draw = ImageDraw.Draw(image_pil_for_drawing)
            # for det in detections_for_drawing:
            #     box = det['box']
            #     label = det['label']
            #     conf = det['confidence']
            #     color = "red" if "entity" in label else "blue" if "attribute" in label else "green" if "relationship" in label else "purple"
            #     draw.rectangle(box, outline=color, width=2)
            #     draw.text((box[0], box[1] - 10), f"{label} ({conf:.2f})", fill=color)
            
            # output_detected_image_path = sample_image_file.parent / f"{sample_image_file.stem}_detected.png"
            # image_pil_for_drawing.save(output_detected_image_path)
            # logger.info(f"Image with detections saved to: {output_detected_image_path}")

        except Exception as e:
            logger.error(f"Error during standalone parsing test: {e}", exc_info=True)
# /opt/intel/oneapi/intelpython/envs/pytorch-gpu/bin/python Training/AI/GenAI/stable_diffusion_server.py

from io import BytesIO
import os
import random
import time
import warnings
from pathlib import Path
from typing import List, Dict, Tuple

# Suppress warnings for a cleaner output.
warnings.filterwarnings("ignore")

import requests

print("Loading torch...")
import torch

print("Loaded torch.")
import torch.nn as nn

print("Adding Intel extension for Pytorch...")
import intel_extension_for_pytorch as ipex  # Used for optimizing PyTorch models

print("Pytorch just got Intel'd.")
from PIL import Image

print("Loading diffusers...")
from diffusers import DiffusionPipeline, DPMSolverMultistepScheduler

print("Loaded diffusers.")


class Text2ImgModel:
    """
    Text2ImgModel is a class for generating images based on text prompts using a pretrained model.

    Attributes:
    - device: The device to run the model on. Default to "xpu" - Intel dGPUs.
    - pipeline: The loaded model pipeline.
    - data_type: The data type to use in the model.
    """

    def __init__(
        self,
        model_id_or_path: str,
        device: str = "xpu",
        torch_dtype: torch.dtype = torch.bfloat16,
        optimize: bool = True,
        enable_scheduler: bool = False,
        warmup: bool = False,
    ) -> None:
        """
        The initializer for Text2ImgModel class.

        Parameters:
        - model_id_or_path: The identifier or path of the pretrained model.
        - device: The device to run the model on. Default is "xpu".
        - torch_dtype: The data type to use in the model. Default is torch.bfloat16.
        - optimize: Whether to optimize the model after loading. Default is True.
        """

        self.device = device
        self.pipeline = self._load_pipeline(
            model_id_or_path, torch_dtype, enable_scheduler
        )
        self.data_type = torch_dtype
        if optimize:
            start_time = time.time()
            # print("Optimizing the model...")
            self.optimize_pipeline()
            # print(
            #    "Optimization completed in {:.2f} seconds.".format(
            #        time.time() - start_time
            #    )
            # )
        if warmup:
            self.warmup_model()

    def _load_pipeline(
        self,
        model_id_or_path: str,
        torch_dtype: torch.dtype,
        enable_scheduler: bool,
    ) -> DiffusionPipeline:
        """
        Loads the pretrained model and prepares it for inference.

        Parameters:
        - model_id_or_path: The identifier or path of the pretrained model.
        - torch_dtype: The data type to use in the model.

        Returns:
        - pipeline: The loaded model pipeline.
        """

        print("Loading the model...")
        model_path = Path(f"/home/common/data/Big_Data/GenAI/{model_id_or_path}")

        if model_path.exists():
            # print(f"Loading the model from {model_path}...")
            load_path = model_path
        else:
            print("Using the default path for models...")
            load_path = model_id_or_path

        pipeline = DiffusionPipeline.from_pretrained(
            load_path,
            torch_dtype=torch_dtype,
            use_safetensors=True,
            variant="fp16",
        )
        if enable_scheduler:
            pipeline.scheduler = DPMSolverMultistepScheduler.from_config(
                pipeline.scheduler.config
            )
        if not model_path.exists():
            try:
                print(f"Attempting to save the model to {model_path}...")
                pipeline.save_pretrained(f"{model_path}")
                print("Model saved.")
            except Exception as e:
                print(
                    f"An error occurred while saving the model: {e}. Proceeding without saving."
                )
        pipeline = pipeline.to(self.device)
        # print("Model loaded.")
        return pipeline

    def _optimize_pipeline(self, pipeline: DiffusionPipeline) -> DiffusionPipeline:
        """
        Optimizes the model for inference using ipex.

        Parameters:
        - pipeline: The model pipeline to be optimized.

        Returns:
        - pipeline: The optimized model pipeline.
        """

        for attr in dir(pipeline):
            try:
                if isinstance(getattr(pipeline, attr), nn.Module):
                    setattr(
                        pipeline,
                        attr,
                        ipex.optimize(
                            getattr(pipeline, attr).eval(),
                            dtype=pipeline.text_encoder.dtype,
                            inplace=True,
                        ),
                    )
            except AttributeError:
                pass
        return pipeline

    def warmup_model(self):
        """
        Warms up the model by generating a sample image.
        """
        print("Setting up model...")
        start_time = time.time()
        self.generate_images(
            prompt="A beautiful sunset over the mountains",
            num_images=1,
            save_path=".tmp",
        )
        print(
            "Model is set up and ready! Warm-up completed in {:.2f} seconds.".format(
                time.time() - start_time
            )
        )

    def optimize_pipeline(self) -> None:
        """
        Optimizes the current model pipeline.
        """

        self.pipeline = self._optimize_pipeline(self.pipeline)

    def generate_images(
        self,
        prompt: str,
        num_inference_steps: int = 50,
        num_images: int = 5,
        save_path: str = "output",
    ) -> List[Image.Image]:
        """
        Generates images based on the given prompt and saves them to disk.

        Parameters:
        - prompt: The text prompt to generate images from.
        - num_inference_steps: Number of noise removal steps.
        - num_images: The number of images to generate. Default is 5.
        - save_path: The directory to save the generated images in. Default is "output".

        Returns:
        - images: A list of the generated images.
        """

        images = []
        for i in range(num_images):
            with torch.xpu.amp.autocast(
                enabled=True if self.data_type != torch.float32 else False,
                dtype=self.data_type,
            ):
                image = self.pipeline(
                    prompt=prompt,
                    num_inference_steps=num_inference_steps,
                    # negative_prompt=negative_prompt,
                ).images[0]
                if not os.path.exists(save_path):
                    try:
                        os.makedirs(save_path)
                    except OSError as e:
                        print("Failed to create directory", save_path, "due to", str(e))
                        raise
            output_image_path = os.path.join(
                save_path,
                f"{'_'.join(prompt.split()[:3])}_{i}_{sum(ord(c) for c in prompt) % 10000}.png",
            )
            image.save(output_image_path)
            images.append(image)
        return images


model_cache = {}
output_dir = "output"
model_ids = [
    "stabilityai/stable-diffusion-2-1",
    "CompVis/stable-diffusion-v1-4",
]


def prompt_to_image(prompt, model_id=model_ids[0], num_images=1, enhance=False):
    """
    `model_id` in `model_ids`
    """
    print(prompt, model_id, num_images)
    # clear_output(wait=True)
    # button.button_style = "warning"
    print("\nOnce generated, images will be saved to `./output` dir, please wait...")
    # selected_model_index = model_id
    # model_id = model_ids[selected_model_index]
    model_key = (model_id, "xpu")
    if model_key not in model_cache:
        model_cache[model_key] = Text2ImgModel(model_id, device="xpu")
    # prompt = prompt_text.value
    # num_images = num_images_slider.value
    # model = Text2ImgModel(model_id, device="xpu")
    model = model_cache[model_key]

    enhancements = [
        "dark",
        "purple light",
        "dreaming",
        "cyberpunk",
        "ancient" ", rustic",
        "gothic",
        "historical",
        "punchy",
        "photo" "vivid colors",
        "4k",
        "bright",
        "exquisite",
        "painting",
        "art",
        "fantasy [,/organic]",
        "detailed",
        "trending in artstation fantasy",
        "electric",
        "night",
        "whimsical",
        "surreal",
        "mystical",
        "nostalgic",
        "vibrant",
        "tranquil",
        "cinematic",
        "enchanted",
        "ethereal",
        "pastoral",
    ]
    if not prompt:
        prompt = " "
    if enhance:
        prompt = prompt + " " + " ".join(random.sample(enhancements, 5))
        print(f"Using enhanced prompt: {prompt}")
    try:
        start_time = time.time()
        model.generate_images(
            prompt,
            num_images=num_images,
            save_path="./output",
        )
        # clear_output(wait=True)
        # display_generated_images()
        output_dir = "output"
        image_files = [
            f for f in os.listdir(output_dir) if f.endswith((".png", ".jpg"))
        ]
        for image_file in image_files:
            yield os.path.join(output_dir, image_file)
    except KeyboardInterrupt:
        print("\nUser interrupted image generation...")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        # button.button_style = "primary"
        print(
            f"Complete generating {num_images} images in './output' in {time.time() - start_time:.2f} seconds."
        )


print(list(prompt_to_image("uc berkeley anime")))

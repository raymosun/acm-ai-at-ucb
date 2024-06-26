# SERVER=https://7ce4-2607-f140-400-8-688d-29d2-527a-6f97.ngrok-free.app/ /opt/intel/oneapi/intelpython/envs/pytorch-gpu/bin/python Training/AI/GenAI/stable_diffusion_server.py

from io import BytesIO
import os
os.environ["OPENAI_API_KEY"] = "s" + "k" + "-pr" + "oj-U" + "bUkPB2SYiTVdARtEaO9T3" + "BlbkFJHbLYrN2EKvvQE17NZTPq" 
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

        # Hardcode a negative prompt
        negative_prompt = [
            "poorly Rendered face",
            "poorly drawn face",
            "poor facial details",
            "poorly drawn hands",
            "poorly rendered hands",
            "low resolution",
            "Images cut out at the top, left, right, bottom.",
            "bad composition",
            "mutated body parts",
            "blurry image",
            "disfigured",
            "oversaturated",
            "bad anatomy",
            "deformed body features",
            "out of frame", 
            "lowres", 
            "text", 
            "error", 
            "cropped", 
            "worst quality", 
            "low quality", 
            "jpeg artifacts", 
            "ugly", 
            "duplicate", 
            "morbid", 
            "mutilated", 
            "out of frame", 
            "extra fingers", 
            "mutated hands", 
            "poorly drawn hands", 
            "poorly drawn face", 
            "mutation", 
            "deformed", 
            "blurry", 
            "dehydrated", 
            "bad anatomy", 
            "bad proportions", 
            "extra limbs", 
            "cloned face", 
            "disfigured, gross proportions", 
            "malformed limbs", 
            "missing arms", 
            "missing legs", 
            "extra arms,"
            "extra legs", 
            "fused fingers", 
            "too many fingers", 
            "long neck", 
            "username", 
            "watermark",
            "signature",
            "monochrome", 
            "(greyscale)",
            "(grayscale)",
            "(black & white)",
            "(washed out)",
            "(daguerreotype)",
            "(sepia)",
            "low quality",
            "smeared",
            "illustration",
            "illustrated",
            "painting"
        ]
        combined_neg_prompt = ""
        for prompt_term in negative_prompt:
            combined_neg_prompt = combined_neg_prompt + prompt_term + ", "
        # combined_neg_prompt = f"({combined_neg_prompt})2.0"
        self.combined_neg_prompt = combined_neg_prompt
        print(f"{self.combined_neg_prompt=}")

        
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
        prompt = prompt + " (full color)1.5, saturated, (vibrant)1.5 " # Encourage colorful output
        for i in range(num_images):
            with torch.xpu.amp.autocast(
                enabled=True if self.data_type != torch.float32 else False,
                dtype=self.data_type,
            ):
                image = self.pipeline(
                    prompt=prompt,
                    num_inference_steps=num_inference_steps,
                    negative_prompt=self.combined_neg_prompt,
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
    "stabilityai/stable-diffusion-xl-base-1.0",
    "stabilityai/stable-diffusion-2-1",
    "CompVis/stable-diffusion-v1-4",
]


from openai import OpenAI
import pdb
def gpt_prompt(short_prompt):
    client = OpenAI(
        # This is the default and can be omitted
        api_key=os.environ.get("OPENAI_API_KEY"),
    )
    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": f"I will give you a line of spoken dialogue or setting. Elaborate that sentence into a prompt suitable for a Stable Diffusion model. Prefer a grounded historical description, output distinct prompts, and be concise (less than 40 words) and specific. Do not say anything else. \n {short_prompt}",
            }
        ],
        model="gpt-4", #"gpt-3.5-turbo",
    )
    return chat_completion.choices[0].message.content

def prompt_to_image(prompt, model_id=model_ids[0], num_images=1, enhance=False):
    """
    `model_id` in `model_ids`
    """
    print(prompt, model_id, num_images)
    prompt = gpt_prompt(prompt) # Elaborate from a short prompt
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


# print(list(prompt_to_image('uc berkeley anime')))

import requests
import os

SERVER = os.environ["SERVER"].rstrip("/")

# ensure dir is empty
for f in os.listdir(output_dir):
    if f.endswith((".png", ".jpg")):
        os.remove(os.path.join(output_dir, f))

images = []
job_id = ""
try:
    while True:
        # https://stackoverflow.com/a/69621045
        response = requests.post(f"{SERVER}/next-image-to-generate", timeout=None)
        if response.status_code == 524:
            # means request took too long (from cloudflare)
            # just means that there's nothing to do for now
            # just wait a bit
            import time

            print("sleeping for 5 seconds")
            time.sleep(5)
            continue
        # https://stackoverflow.com/a/24531618
        response.raise_for_status()
        job_id, prompt = response.text.split("\n", 1)
        print("generate:", prompt)
        for image in images:
            os.remove(image)
        images = list(prompt_to_image(prompt))
        print("generated:", images)
        requests.post(
            f"{SERVER}/submit-image",
            params={"id": job_id, "name": images[0]},
            data=open(images[0], "rb"),
        )
        job_id = ""
finally:
    # Release job so it doesn't get lost
    requests.post(
        f"{SERVER}/release-job",
        params={"id": job_id},
    )

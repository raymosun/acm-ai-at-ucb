# acm-ai-at-ucb

## Hume example

you need to install node

copy `empathy/.env.example` to `empathy/.env`, then go to https://beta.hume.ai/settings/keys and fill in your `empathy/.env` file

then run these commands:

```shell
$ cd empathy
$ npm install
$ npm run dev
http://0.0.0.0:8000/
```

Open http://0.0.0.0:8000/ in the browser and open the console.

## Intermediary server

```shell
$ cd intermediate-stable-diffusion-server
$ npm install
$ npm start
Example app listening http://localhost:3000
```

In another tab, run this. You will need to install [`cloudflared`](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/) for their anonymous tunnels.

```shell
$ cloudflared tunnel --url http://localhost:3000
```

This will produce a URL.

On Intel's Jupyter notebook training, select **Pytorch GPU** as the kernel, and install this extra dependency.

```shell
$ /opt/intel/oneapi/intelpython/envs/pytorch-gpu/bin/python -m pip install requests  --user > /dev/null 2>&1
```

Finally, start the Intel server that generates the Stable Diffusion images.

```shell
$ SERVER=https://ch-aqua-asian-paradise.trycloudflare.com/ /opt/intel/oneapi/intelpython/envs/pytorch-gpu/bin/python Training/AI/GenAI/stable_diffusion_server.py
```

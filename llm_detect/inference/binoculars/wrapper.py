
from .binoculars import Binoculars

from llm_detect.inference import Binoculars

model = Binoculars(observer_name_or_path="TinyLlama/TinyLlama_v1.1",
                   performer_name_or_path='Jiayi-Pan/Tiny-Vicuna-1B')


import pandas as pd
data = pd.read_csv('./data/data.csv')

model.get_score([data['text'][0]])


import pandas as pd
import numpy as np
import skops.io

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import make_pipeline
from sklearn.linear_model import SGDClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import train_test_split, GridSearchCV

from settings import settings


def load_data(data_path='data/data.csv', test_size=0.20, random_state=42):
    data = pd.read_csv(data_path)
    data = data[data['text'].str.len().between(500, 5000)]
    X, y = data['text'], data['label']
    if test_size > 0:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, shuffle=True, random_state=random_state, stratify=y)
        return X_train, X_test, y_train, y_test
    return X, y

    
def train_model(X_train, X_test, y_train, y_test, output_path=settings.SVM_BASELINE_PATH):
    pipe = make_pipeline(TfidfVectorizer(), SGDClassifier())

    # hyper-parameter tuning
    grid =  [{
        'tfidfvectorizer__ngram_range': [(1, 1), (1, 2)],
        'sgdclassifier__loss': ['hinge', 'log_loss', 'perceptron']}]
    gs = GridSearchCV(pipe, grid, cv=5, scoring='f1_macro', n_jobs=-1, refit=True, verbose=1)
    gs.fit(X_train, y_train)
    print("- Best training CV f1_macro: {:.3f}".format(gs.best_score_))
    print("- Best params: ", gs.best_params_)

    print("- Calibrating model on test set")
    # SGDClassifier doens't output probabilities, so calibrate it on the test split
    clf = gs.best_estimator_
    # refit with best parameters
    clf.fit(X_train, y_train)
    clf = CalibratedClassifierCV(clf, cv="prefit").fit(X_test, y_test)

    print("- Serializing model")
    skops.io.dump(clf, output_path)


def load_model(path='svm_baseline.skops'):
    skops.io.get_untrusted_types(file=path)
    return skops.io.load(
        'svm_baseline.skops',
        trusted=['sklearn.calibration._CalibratedClassifier',
                 'sklearn.calibration._SigmoidCalibration'])


def get_coefficients(clf, top_k=100):
    coefficients = clf.estimator.named_steps.sgdclassifier.coef_[0]
    feature_names = clf.estimator.named_steps.tfidfvectorizer.get_feature_names_out()
    neg, = np.where(np.array(coefficients) < 0)
    coefficients_neg = coefficients[neg] / -np.min(coefficients[neg])
    pos, = np.where(np.array(coefficients) >= 0)
    coefficients_pos = coefficients[pos] / np.max(coefficients[pos])
    neg_sort, pos_sort = np.argsort(coefficients_neg), np.argsort(coefficients_pos)
    coefficients = np.concatenate([coefficients_neg[neg_sort], coefficients_pos[pos_sort]])
    feature_names = np.concatenate([feature_names[neg][neg_sort], feature_names[pos][pos_sort]])
    # zero-th out of top-k
    coefficients[top_k:-top_k] = 0
    return dict(zip(feature_names, coefficients))



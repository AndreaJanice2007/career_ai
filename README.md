# AI Career Recommendation System

An ML-based career recommendation system that analyzes software and essential skills to recommend suitable career paths.

## Objective

The system uses occupational skill data to predict suitable careers based on a student's skills. It also performs skill-gap analysis and calculates career readiness.

## Dataset

This project uses O*NET occupational data containing:

- Occupation information
- Software skills
- Essential skills
- Career interest information

## Machine Learning Models

The following algorithms were evaluated:

- Logistic Regression
- Bernoulli Naive Bayes
- K-Nearest Neighbors (KNN)
- Decision Tree
- Random Forest
- Support Vector Machine (SVM)
- Linear Regression

## Model Results

| Model | Accuracy |
|---|---:|
| SVM | 63.88% |
| Random Forest | 63.29% |
| Logistic Regression | 62.40% |
| Bernoulli Naive Bayes | 60.09% |
| KNN | 33.22% |
| Decision Tree | 9.25% |

SVM achieved the highest classification accuracy of 63.88%.

## Features

- Career recommendation
- Top career predictions
- Skill-gap analysis
- Career readiness score
- Personalized learning roadmap

## Workflow

O*NET Data  
↓  
Data Cleaning  
↓  
Feature Engineering  
↓  
Student Skill Profiles  
↓  
Train/Test Split  
↓  
ML Model Training  
↓  
Model Comparison  
↓  
Career Recommendation  
↓  
Skill Gap Analysis  
↓  
Learning Roadmap

## Important Note

The student profiles used in this experiment are synthetically generated from O*NET occupational requirements. Therefore, the reported accuracy is an experimental benchmark and should not be interpreted as accuracy on real student populations.

## Future Improvements

- Use real student skill data
- Improve career recommendation confidence
- Add explainable AI
- Add career-family classification
- Build an interactive web interface
- Generate more personalized learning recommendations
# Overview
RecipeLibrary is a web application that allows users to create accounts, log in, and manage recipes. The project uses Node.js, Express, and MySQL to handle backend functionality and data storage.

# Database Setup
MySQL Workbench and MySQL Server are the tools being used.
Database name: recipe_library

Users table: 

Field	Type	Description
user_id	INT (PK)	Unique ID for each user
username	VARCHAR(255)	Unique username
password	VARCHAR(255)	User password (will be hashed later)


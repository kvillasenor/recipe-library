# Overview
RecipeLibrary is a web application that allows users to create accounts, log in, and manage recipes. The project uses Node.js, Express, and MySQL to handle backend functionality and data storage. HTML, CSS, and JavaScript are used for the frontend part of the project.

# Database Setup
MySQL Workbench and MySQL Server are the tools being used.  

**Database name:** recipe_library

**Users table:**  
Field Type Description  
user_id	INT (PK)	Unique ID for each user  
username	VARCHAR(255)	Unique username  
password	VARCHAR(255)	User password (hashed)

**Recipes table:**  
Field Type Description  
id	int	NO	PRI		auto_increment  
user_id	int	YES	MUL  
title	varchar(255)	NO  
ingredients	text	YES  
instructions	text	YES  
prep_time	int	YES  
cook_time	int	YES  
course	varchar(100)	YES  
category	varchar(100)	YES  
image	varchar(255)	YES  

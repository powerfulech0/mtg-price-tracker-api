variable "aws_region" {
  description = "AWS region to deploy to"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "db_password" {
  description = "PostgreSQL database password"
  type        = string
  sensitive   = true
}

variable "api_keys" {
  description = "Comma-separated list of API keys for authentication"
  type        = string
  sensitive   = true
}

variable "docker_image" {
  description = "Docker image to deploy"
  type        = string
  default     = "ghcr.io/grearden/mtg-price-tracker-api:latest"
}

variable "ssh_allowed_cidr" {
  description = "CIDR block allowed to SSH into the instance (e.g., your IP)"
  type        = string
  default     = "0.0.0.0/0"
}

variable "key_pair_name" {
  description = "Name of the EC2 key pair for SSH access"
  type        = string
  default     = ""
}

variable "ebs_volume_size" {
  description = "Size of the EBS volume in GB"
  type        = number
  default     = 20
}

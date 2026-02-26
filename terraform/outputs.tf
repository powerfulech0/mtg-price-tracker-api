output "ec2_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_eip.main.public_ip
}

output "ec2_instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.main.id
}

output "api_url" {
  description = "URL to access the API"
  value       = "http://${aws_eip.main.public_ip}"
}

output "health_check_url" {
  description = "Health check endpoint"
  value       = "http://${aws_eip.main.public_ip}/health"
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = var.key_pair_name != "" ? "ssh -i ${var.key_pair_name}.pem ec2-user@${aws_eip.main.public_ip}" : "No key pair configured"
}

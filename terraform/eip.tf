# Elastic IP for static public IP address
resource "aws_eip" "main" {
  instance = aws_instance.main.id
  domain   = "vpc"

  tags = {
    Name = "mtg-price-tracker-eip"
  }

  depends_on = [aws_internet_gateway.main]
}

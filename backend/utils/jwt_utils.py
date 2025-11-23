import jwt
import datetime
from dotenv import load_dotenv
import os
load_dotenv()


class JWTManager:
    def __init__(self):
        self.secret_key = os.getenv("SECRET_KEY", "default_secret_key")
        self.algorithm = os.getenv("ALGORITHM", "HS256")
        self.expiration_hours = int(os.getenv("EXPIRATION_HOURS", 1))

    def generate_token(self, user_id):
        try:
            now = datetime.datetime.now(datetime.timezone.utc)
            expiration_time = now + datetime.timedelta(hours=self.expiration_hours)

            payload = {
                "user_id": user_id,
                "exp": expiration_time,
                "iat": now
            }
            token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
            return token
        except Exception as e:
           print(f"Error generating token: {e}")

    def validate_token(self, token):
        try:
            decoded_payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return decoded_payload
        except jwt.ExpiredSignatureError:
            return "Token has expired."
        except jwt.InvalidTokenError:
            return "Invalid token."

    def decode_token(self, token: str):
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            print("Token has expired.")
            return None
        except jwt.InvalidTokenError:
            print("Invalid token.")
            return None

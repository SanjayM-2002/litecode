import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { IAuthResponse } from '@litecode/shared-types';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Register a new participant account' })
  @ApiCreatedResponse({
    type: AuthResponseDto,
    description: 'Account created — returns a JWT and the public user profile',
  })
  @ApiConflictResponse({ description: 'Email already registered' })
  async signup(@Body() body: SignupDto): Promise<IAuthResponse> {
    return await this.authService.signup(body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate an existing user' })
  @ApiOkResponse({
    type: AuthResponseDto,
    description: 'Authenticated — returns a JWT and the public user profile',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(@Body() body: LoginDto): Promise<IAuthResponse> {
    return await this.authService.login(body);
  }
}

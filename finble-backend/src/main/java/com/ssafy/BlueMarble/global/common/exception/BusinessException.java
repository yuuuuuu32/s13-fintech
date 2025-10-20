package com.ssafy.BlueMarble.global.common.exception;

import lombok.Getter;

@Getter
public class BusinessException extends RuntimeException {

    private final BusinessError businessError;

    public BusinessException(BusinessError businessError) {
        super(businessError.getMessage());
        this.businessError = businessError;
    }
}